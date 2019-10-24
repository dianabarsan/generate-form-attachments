const { COUCH_URL } = process.env;
const rpn = require('request-promise-native');
const url = require('url');
const xmlJs = require('xml-js');

const couchConfig = (() => {
  if (!COUCH_URL) {
    throw 'Required environment variable COUCH_URL is undefined. (eg. http://your:pass@localhost:5984/yourdb)';
  }
  const parsedUrl = url.parse(COUCH_URL);
  if (!parsedUrl.auth) {
    throw 'COUCH_URL must contain admin authentication information';
  }

  return {
    path: path => `${parsedUrl.protocol}//${parsedUrl.auth}@${parsedUrl.host}/${parsedUrl.path.substring(1)}/${path}`,
  };
})();

const getReportsByForm = async (startKey = '', startKeyDocId = '') => {
  const opts = {
    limit: 1000,
    include_docs: true,
    reduce: false,
  };
  const path = '_design/medic-client/_view/reports_by_form';

  if (startKey) {
    opts.start_key = JSON.stringify(startKey);
    opts.start_key_doc_id = startKeyDocId;
  }

  const result = await rpn({ uri: couchConfig.path(path), json: true, qs: opts });
  let nextKey;
  let nextKeyDocId;
  const reports = [];
  result.rows.forEach(row => {
    if (row.id === startKeyDocId) {
      return;
    }

    nextKey = row.key;
    nextKeyDocId = row.id;
    reports.push(row.doc);
  });

  return { nextKey, nextKeyDocId, reports };
};

const jsonToXml = (doc) => {
  const attachmentJson = {};
  attachmentJson[doc.form] = {
    _attributes: {
      'xmlns:jr': 'http://openrosa.org/javarosa',
      'xmlns:orx': 'http://openrosa.org/xforms',
      delimiter: '#',
      id: doc.form,
    }
  };
  Object.assign(attachmentJson[doc.form], doc.fields);
  return xmlJs.js2xml(attachmentJson, { compact: true });
};

const createAttachments = async (reports) => {
  for (let report of reports) {
    if (!report.content_type || report.content_type !== 'xml') {
      // skip non-xform reports
      continue;
    }
    if (report._attachments && report._attachments.content) {
      // skip reports that already have attachments
      continue;
    }
    const attachment = jsonToXml(report);
    console.debug('creating attachment for report', report._id);
    await rpn({
      uri: couchConfig.path(`${report._id}/content`),
      method: 'PUT',
      body: attachment,
      headers: { 'Content-Type': 'application/xml' },
      qs: { rev: report._rev },
    })
  }
};

(async () => {
  let startKey;
  let startKeyDocId;
  do {
    console.debug('requesting with startkey', startKey, startKeyDocId);
    const result = await getReportsByForm(startKey, startKeyDocId);
    startKey = result.nextKey;
    startKeyDocId = result.nextKeyDocId;
    await createAttachments(result.reports);
  } while (startKey && startKeyDocId);
})();

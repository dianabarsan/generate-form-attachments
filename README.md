# Generate form attachments [ALPHA]

Are you adding dummy data from CSV-s using `medic-conf` and all your xml reports are attachment-less?
Running this script will create and upload `content` xml attachments to _very roughly_ simulate the `model` XML resulting
from submitting an Enketo XML form. It might even make the reports editable, granted the `form` doc itself exists it's fields correspond to the report `fields`. 

### Installation

```
git clone https://github.com/dianabarsan/generate-form-attachments
cd generate-form-attachments
npm ci
```

### Execution

Execution requires 
- an environment variable `COUCH_URL` to define the database + authentication to interact with.
- `cht-core` to have been deployed on the database in question (execution depends on querying `medic-client` views)

```
export COUCH_URL=http://<your_admin_user>:<your_admin_pass>@localhost:5984/<your_db_name>
npm run create
```
 
### Caveats

This will update all reports in your DB that have `content_type === xml`, a `form` field and no `content` attachment. 
Sentinel will process all these changes. If you want Sentinel to skip them, stop the service while the script is running,
 and update `_local/sentinel-meta-data.processed_seq` with the main db-s `update_seq` manually once execution is finished.

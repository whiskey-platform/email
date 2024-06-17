# Whiskey Email

This set of infrastructure enables the real-time processing and storage of emails that are sent to \*@mattwyskiel.com and mwwyskiel@gmail.com

## Core Infra

Whiskey contains the following:

- an S3 bucket to store emails

```
/
- raw/
  - gmail/
    - {gmail_id}.json
  - improvmx/
    - {improvmx_id}.json
- messages/
  - {id}/
      - body.html _or_ body.txt
      - attachments/
      - inlines/
      - meta.json
```

- an EventBridge Event Schema, as the Whiskey Event Bus will be hydrated with events from Whiskey Email

## Ingest

Upon request, Whiskey can ingest all available emails from the GMAIL API, and save them in

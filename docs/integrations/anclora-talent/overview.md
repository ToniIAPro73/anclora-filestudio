# Anclora Talent Integration

Anclora Talent consumes FileStudio as `requestingOrg: "anclora"` and
`requestingApp: "anclora-talent"` with header
`X-Anclora-Client-Id: anclora-talent`.

Supported modes:

|Mode|Use|
|---|---|
|Local Agent|`image:resize`, `image:convert`; optional engines when advertised.|
|Service|`image:resize`, `image:convert`; optional Calibre/Tesseract jobs.|
|Browser|Lightweight image operations inside Talent.|

`yt-dlp` and third-party content downloads are excluded.

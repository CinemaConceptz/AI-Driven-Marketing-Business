# Postmark Templates

## Required Template IDs
Set in env:
- POSTMARK_TEMPLATE_WELCOME_ID
- POSTMARK_TEMPLATE_EPK_UPDATED_ID
- POSTMARK_TEMPLATE_ADMIN_NEW_APP_ID
- POSTMARK_MESSAGE_STREAM=outbound

## Expected Template Models

### Welcome
```
{
  "dashboardUrl": "https://verifiedsoundar.com/dashboard",
  "mediaUrl": "https://verifiedsoundar.com/media",
  "name": "Artist Name"
}
```

### EPK Updated
```
{
  "epkUrl": "https://verifiedsoundar.com/epk",
  "title": "Press Image",
  "caption": "",
  "downloadUrl": "https://..."
}
```

### Admin New Application
```
{
  "uid": "uid",
  "email": "user@email.com",
  "name": "Artist",
  "genre": "House",
  "links": "...",
  "goals": "...",
  "submittedAt": "ISO timestamp"
}
```

> Templates can be refined later; HTML/text fallbacks are used when IDs are missing.

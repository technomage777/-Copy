# Story Voice Studio

This branch contains a personal OpenAI text-to-speech web app designed for 24-word video-scene narration.

## Features

- OpenAI `gpt-4o-mini-tts`
- Default voice: `ash`
- Exact numeric speed input such as `0.95`
- MP3 or WAV output
- Editable storytelling instructions
- 24-word paragraph checker
- Audio preview and download
- API key stays server-side in Vercel

## Deploy on Vercel

1. Import the GitHub repository `technomage777/-Copy` into Vercel.
2. Set the project's Production Branch to `tts-app`.
3. Add an Environment Variable:
   - Name: `OPENAI_API_KEY`
   - Value: your OpenAI API key
4. Deploy or redeploy the project.
5. Open the Vercel URL and use the app.

Do not commit an API key to GitHub. The browser calls `/api/speech`, and that serverless function reads the key from Vercel's environment.

The app uses OpenAI's `POST /v1/audio/speech` endpoint.

Deployment trigger: Vercel-ready.

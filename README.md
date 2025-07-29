# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/e008cf03-4674-4ffb-9a6f-8405e9cbc557

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e008cf03-4674-4ffb-9a6f-8405e9cbc557) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## AI Model Configuration

This application supports multiple AI providers and both cloud and local models:

### Cloud Providers
- **OpenAI** (GPT-4 Turbo)
- **Anthropic** (Claude 3 Opus)
- **Google** (Gemini Pro)

### Local Providers
- **Ollama** (Various local models)
- **LM Studio** (OpenAI-compatible local models)

### Setup

1. Copy the environment template:
```sh
cp .env.local.example .env.local
```

2. Configure your API keys and endpoints in `.env.local`:
```env
# Cloud providers (optional - only add keys for providers you want to use)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_ai_api_key_here

# Local providers (optional - only add if you have these services running)
OLLAMA_BASE_URL=http://localhost:11434
LM_STUDIO_BASE_URL=http://localhost:1234
```

3. Restart the development server:
```sh
npm run dev
```

### Features
- **Automatic Model Discovery**: Local models are automatically detected
- **Health Monitoring**: Real-time status indicators for all models
- **Fallback Support**: Automatically switches to backup models if primary fails
- **Performance Metrics**: Shows response times and connection status

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e008cf03-4674-4ffb-9a6f-8405e9cbc557) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

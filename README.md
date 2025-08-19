# MCT Labs - AI-Powered Creativity Hub

MCT Labs is an advanced AI-powered platform designed for the Department of Multimedia and Creative Technology (MCT) at Daffodil International University. It provides students and faculty with cutting-edge AI tools for creativity, learning, and innovation.

## Features

- **MCT GPT**: Intelligent conversational AI with multiple modes (Standard, Beta, Advanced)
- **MCT Canvas**: AI-powered image generation with multiple quality modes
- **Coder**: Code analysis and programming assistance with AI feedback
- **Tuner**: Text-to-speech and speech-to-text conversion
- **Echo**: Persona-based AI conversations with customizable characters
- **Animation**: AI-powered video and animation generation
- **3D**: 3D model generation from text and images
- **Build**: App and game creation tools with AI assistance

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **AI Models**: Multiple providers (OpenRouter, XET, ElevenLabs, MiniMaxi)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project setup

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mct-labs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

4. Start the development server:
```bash
npm run dev
```

### Deployment

The app is configured for Vercel deployment:

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Security Features

- Row Level Security (RLS) with Firestore
- Email verification for all users
- DIU student email validation
- Admin role verification
- Session timeout management
- Security event logging
- Rate limiting
- Input sanitization

## User Roles

- **Students**: DIU MCT students with verified @diu.edu.bd emails
- **Admin**: System administrator with full access
- **Guests**: Limited access, must register to use features

## API Integration

The platform integrates with multiple AI services:
- OpenRouter (Chat models)
- XET (Image generation)
- ElevenLabs (Speech services)
- MiniMaxi (Video generation)

## Contributing

This project is developed by Md Rakibujjaman Adib for the MCT Department at Daffodil International University.

## License

© 2025 MCT Labs. All rights reserved.

## Support

For support and inquiries, contact the MCT Department at Daffodil International University.
# Backend (NestJS)

A NestJS backend service for the JSON Prompt Application, providing authentication, user management, and LLM configuration APIs.

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin User (created when running yarn seed)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3002/auth/google/callback

# LLM Configuration
# List of providers (comma-separated)
LLM_PROVIDERS=fireworks,openrouter

# Fireworks Configuration (OpenAI-compatible)
LLM_FIREWORKS_API_KEY=your_fireworks_api_key_here
LLM_FIREWORKS_BASE_URL=https://api.fireworks.ai/inference/v1
LLM_FIREWORKS_DEFAULT_MODEL=accounts/fireworks/models/llama-v3p1-405b-instruct
LLM_FIREWORKS_MODELS=accounts/fireworks/models/llama-v3p1-405b-instruct,accounts/fireworks/models/mixtral-8x7b-instruct

# OpenRouter Configuration (OpenAI-compatible)
LLM_OPENROUTER_API_KEY=your_openrouter_api_key_here
LLM_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
LLM_OPENROUTER_MODELS=openai/gpt-4o-mini,anthropic/claude-3-haiku

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000  # Comma-separated list of allowed origins
```

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

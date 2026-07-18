# Smart POS 
> High-performance point-of-sale system with demand prediction engine.


![Next.js](https://img.shields.io/badge/Next.js-16-black)
![C++](https://img.shields.io/badge/C++-Engine-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

## Authentication

Authentication uses Auth.js credentials with encrypted JWT sessions stored in
secure HTTP only cookies. Tokens contain the user id and role, expire after
eight hours, and are used to protect both authenticated and admin routes.

Copy `.env.example` to `.env.local`, configure `DATABASE_URL`, and generate a
unique authentication secret before starting the app:

```bash
npx auth secret
```

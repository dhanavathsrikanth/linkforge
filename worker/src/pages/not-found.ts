export function getNotFoundHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Not Found - LinkForge</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #09090b;
      color: #fafafa;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      max-width: 400px;
      padding: 2rem;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: #a1a1aa;
      margin-bottom: 2rem;
    }
    a {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background-color: #fafafa;
      color: #09090b;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    a:hover {
      opacity: 0.9;
    }
    .logo {
      font-size: 1.25rem;
      font-weight: bold;
      color: #fafafa;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="logo">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
    LinkForge
  </div>
  <div class="container">
    <h1>Link Not Found</h1>
    <p>This link doesn't exist or has expired.</p>
    <a href="https://linkforge.io">Go to LinkForge</a>
  </div>
</body>
</html>`;
}

export function getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - LinkForge</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #09090b;
      color: #fafafa;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      max-width: 400px;
      padding: 2rem;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: #a1a1aa;
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

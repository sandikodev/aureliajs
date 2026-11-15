/**
 * 404 Not Found Page Component
 * 
 * Demonstrates:
 * - Fallback routes
 * - Simple error handling
 */

export const NotFoundPage = {
  name: 'NotFoundPage',
  
  render(_props?: Record<string, unknown>) {
    return `
      <div id="app" class="not-found-page">
        <div class="container">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>Sorry, we couldn't find the page you're looking for.</p>
          <p><a href="/">← Back to Home</a></p>
        </div>

        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            color: white;
            padding: 2rem;
          }
          h1 {
            font-size: 5rem;
            margin: 0;
            font-weight: bold;
          }
          h2 {
            font-size: 1.5rem;
            margin: 0.5rem 0 1rem;
            font-weight: 400;
          }
          p { margin: 1rem 0; }
          a {
            color: white;
            text-decoration: none;
            border: 2px solid white;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            display: inline-block;
            transition: all 0.3s ease;
          }
          a:hover {
            background: white;
            color: #667eea;
          }
        </style>
      </div>
    `;
  }
};

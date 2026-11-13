/**
 * Home Page Component
 * 
 * Demonstrates:
 * - Basic server-side rendering
 * - Data loader integration (posts)
 * - Client-side hydration
 */

export const HomePage = {
  name: 'HomePage',
  
  render(props: any) {
    const posts = props?.posts || [];
    
    return `
      <div id="app" class="home-page">
        <header>
          <h1>Hono + Aurelia SSR Example</h1>
          <p>A minimal working example of server-side rendering</p>
        </header>

        <main>
          <section class="posts">
            <h2>Recent Posts</h2>
            <ul>
              ${posts.map((post: any) => `
                <li>
                  <a href="/posts/${post.slug}">
                    <strong>${post.title}</strong>
                  </a>
                </li>
              `).join('')}
            </ul>
          </section>

          <section class="cta">
            <p>👉 <a href="/dashboard">View Dashboard</a> (requires auth)</p>
          </section>
        </main>

        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
            max-width: 600px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            color: #333;
          }
          header { border-bottom: 2px solid #eee; padding-bottom: 1rem; }
          h1 { margin: 0; }
          section { margin: 2rem 0; }
          ul { list-style: none; padding: 0; }
          li { margin: 0.5rem 0; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .cta { background: #f5f5f5; padding: 1rem; border-radius: 4px; }
        </style>
      </div>
    `;
  }
};

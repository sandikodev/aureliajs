/**
 * Dashboard Page Component
 * 
 * Demonstrates:
 * - Protected routes (requiresAuth)
 * - Multiple data loaders (stats, recentActivity)
 * - Auth context usage
 * - Parallel data loading
 */

export const DashboardPage = {
  name: 'DashboardPage',
  
  render(props: any) {
    const stats = props?.stats || {};
    const activity = props?.recentActivity || [];
    
    return `
      <div id="app" class="dashboard-page">
        <header>
          <h1>${stats.title || 'Dashboard'}</h1>
        </header>

        <main>
          <section class="stats">
            <h2>Statistics</h2>
            <div class="stat-grid">
              <div class="stat">
                <span class="label">Views</span>
                <span class="value">${stats.views?.toLocaleString() || 0}</span>
              </div>
              <div class="stat">
                <span class="label">Posts</span>
                <span class="value">${stats.posts || 0}</span>
              </div>
              <div class="stat">
                <span class="label">Engagement</span>
                <span class="value">${stats.engagement || 0}%</span>
              </div>
            </div>
          </section>

          <section class="activity">
            <h2>Recent Activity</h2>
            <ul>
              ${activity.map((item: any) => `
                <li>
                  <strong>${item.action}</strong>
                  <span class="time">${item.timestamp}</span>
                </li>
              `).join('')}
            </ul>
          </section>

          <section class="nav">
            <p><a href="/">← Back to Home</a></p>
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
            background: #f9f9f9;
          }
          header { border-bottom: 2px solid #007bff; padding-bottom: 1rem; margin-bottom: 2rem; }
          h1 { margin: 0; color: #007bff; }
          h2 { margin-top: 2rem; margin-bottom: 1rem; color: #333; }
          section { background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; }
          
          .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
          }
          .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1rem;
            background: #f0f0f0;
            border-radius: 4px;
          }
          .stat .label { font-size: 0.9rem; color: #666; }
          .stat .value { font-size: 1.5rem; font-weight: bold; color: #007bff; }
          
          ul { list-style: none; padding: 0; }
          li { 
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid #eee;
          }
          li:last-child { border-bottom: none; }
          .time { color: #999; font-size: 0.9rem; }
          
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </div>
    `;
  }
};

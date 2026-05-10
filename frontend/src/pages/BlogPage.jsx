// frontend/src/pages/BlogPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './BlogPage.css';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/blog')
      .then(res => {
        if (!res.ok) throw new Error('خطا در دریافت مقالات');
        return res.json();
      })
      .then(data => {
        setPosts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('خطا در ارتباط با سرور');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">⏳ در حال بارگذاری...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="blog-page">
      <div className="container">
        {/* لینک بازگشت ساده به جای breadcrumb */}
        <div className="back-link">
          <Link to="/">← بازگشت به صفحه اصلی</Link>
        </div>
        <h1>مجله کاشی و سرامیک آسمان</h1>
        <div className="blog-grid">
          {posts.map(post => (
            <article key={post.id} className="blog-card">
              {post.image && (
                <img src={post.image} alt={post.title} className="blog-card-image" />
              )}
              <div className="blog-card-content">
                <h2>
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <div className="blog-meta">
                  <span>📅 {new Date(post.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
                <p>{post.excerpt || post.content?.substring(0, 150).replace(/<[^>]*>/g, '')}...</p>
                <Link to={`/blog/${post.slug}`} className="read-more">بیشتر بخوانید →</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
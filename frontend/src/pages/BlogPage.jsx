// frontend/src/pages/BlogPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './BlogPage.css';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blog');
      if (!res.ok) throw new Error('خطا در دریافت مقالات');
      const data = await res.json();
      const postsData = data.posts || data || [];
      setPosts(postsData);
    } catch (err) {
      console.error(err);
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="blog-page-loading">
        <div className="loading-spinner"></div>
        <p>در حال بارگذاری مقالات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blog-page-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={fetchPosts} className="retry-btn">تلاش مجدد</button>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <div className="blog-container">
        {/* هدر صفحه */}
        <div className="blog-header">
          <h1>مجله کاشی و سرامیک آسمان</h1>
          <p>جدیدترین مطالب و مقالات تخصصی در دنیای کاشی و سرامیک</p>
        </div>

        {/* لیست مقالات به صورت مستطیلی */}
        {posts.length === 0 ? (
          <div className="blog-empty">
            <div className="empty-icon">📭</div>
            <p>هیچ مقاله‌ای یافت نشد</p>
            <Link to="/" className="back-home">بازگشت به صفحه اصلی</Link>
          </div>
        ) : (
          <div className="blog-list">
            {posts.map((post) => (
              <article key={post.id} className="blog-item">
                <Link to={`/blog/${post.slug}`} className="blog-item-link">
                  <div className="blog-item-image">
                    {post.image ? (
                      <img src={post.image} alt={post.title} />
                    ) : (
                      <div className="image-placeholder">
                        <span>📷</span>
                      </div>
                    )}
                  </div>
                  <div className="blog-item-content">
                    <h3 className="blog-item-title">{post.title}</h3>
                    <p className="blog-item-excerpt">
                      {post.excerpt || post.content?.substring(0, 150).replace(/<[^>]*>/g, '')}...
                    </p>
                    <div className="blog-item-footer">
                      <span className="blog-date">
                        📅 {new Date(post.created_at).toLocaleDateString('fa-IR')}
                      </span>
                      <span className="read-more">بیشتر بخوانید ←</span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}

        {/* لینک بازگشت */}
        <div className="blog-back-link">
          <Link to="/" className="back-to-home">← بازگشت به صفحه اصلی</Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
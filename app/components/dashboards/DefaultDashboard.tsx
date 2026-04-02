// هذا هو الكود القديم الذي كان في page.tsx
export default function DefaultDashboard() {
  return (
    <>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderBottom: '4px solid #2563eb' }}>
          <div className="stat-icon" style={{ background: '#2563eb' }}>
            <i className="fa-solid fa-user-graduate"></i>
          </div>
          <div className="stat-info">
            <h3>1,250</h3>
            <p>إجمالي الطلاب</p>
          </div>
        </div>
        {/* ... باقي الكروت القديمة ... */}
      </div>
      {/* ... باقي الجدول ... */}
    </>
  );
}
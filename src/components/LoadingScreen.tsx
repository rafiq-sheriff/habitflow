export function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100%",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "linear-gradient(135deg,#7c6af7,#a78bfa)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: "0 6px 24px rgba(124,106,247,.35)",
        }}
      >
        ✦
      </div>
      <div className="spinner" style={{ width: 26, height: 26 }} />
    </div>
  );
}

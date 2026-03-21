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
          borderRadius: 14,
          background: "linear-gradient(145deg, var(--color-primary), var(--color-primary-dark))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          color: "#fff",
          boxShadow: "0 8px 24px rgba(34, 197, 94, 0.28)",
        }}
      >
        ✦
      </div>
      <div className="spinner" style={{ width: 26, height: 26 }} />
    </div>
  );
}

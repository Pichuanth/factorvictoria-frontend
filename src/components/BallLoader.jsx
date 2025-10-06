// src/components/BallLoader.jsx
export default function BallLoader() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-slate-950 z-50">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 animate-[bounce_0.9s_infinite] shadow-[0_12px_30px_-10px_rgba(99,102,241,0.7)]" />
    </div>
  );
}

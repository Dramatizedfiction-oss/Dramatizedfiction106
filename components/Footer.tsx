export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 p-6 text-center text-slate-500 text-sm">
      © {new Date().getFullYear()} Dramatized Fiction. All rights reserved.
    </footer>
  );
}

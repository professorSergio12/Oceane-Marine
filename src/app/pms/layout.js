export const metadata = {
  title: "PMS | STS Management",
};

export default function PmsLayout({ children }) {
  return (
    <div className="relative min-h-screen bg-transparent text-white pt-6">
      {children}
    </div>
  );
}


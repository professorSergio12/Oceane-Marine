import GoToDashBoardButton from "../components/GoToDashBoardButton";
export const metadata = {
  title: "PMS | STS Management",
};

export default function PmsLayout({ children }) {
  return (
    <div className="relative min-h-screen bg-transparent text-white pt-6">
      <GoToDashBoardButton offsetLeftPx={316} />
      {children}
    </div>
  );
}


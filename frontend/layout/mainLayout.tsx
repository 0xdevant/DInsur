import { PropsWithChildren } from "react";
import Navbar from "../components/navigation/navbar";

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <div>
      <Navbar />
      {children}
    </div>
  );
}

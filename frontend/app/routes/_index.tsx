import { redirect } from "react-router";

export function loader() {
  return redirect("/documents");
}

export default function Index() {
  return null; 
}
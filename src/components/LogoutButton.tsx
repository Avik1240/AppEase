import { logout } from "@/app/(auth)/actions";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="btn-ghost text-sm">
        Log out
      </button>
    </form>
  );
}

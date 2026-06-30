import type { MockUser } from "../types";

interface HeaderProps {
  activeUserKey: MockUser["key"];
  users: MockUser[];
  onUserChange: (key: MockUser["key"]) => void;
}

export default function Header({
  activeUserKey,
  users,
  onUserChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-300/80 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Submission & Approval Workflow
          </p>
          <h1 className="font-serif text-2xl text-slate-900">Operations Console</h1>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2">
          <span className="text-sm font-semibold text-slate-700">Active User</span>
          <select
            className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-sm"
            value={activeUserKey}
            onChange={(event) => onUserChange(event.target.value as MockUser["key"])}
          >
            {users.map((user) => (
              <option key={user.key} value={user.key}>
                {user.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}

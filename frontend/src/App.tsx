import { useEffect, useMemo, useState } from "react";
import { getApplications } from "./api";
import ApplicantDashboard from "./components/ApplicantDashboard";
import ErrorBanner from "./components/ErrorBanner";
import Header from "./components/Header";
import ReviewerDashboard from "./components/ReviewerDashboard";
import type { Application, MockUser } from "./types";

const users: MockUser[] = [
  {
    key: "alice",
    label: "Alice (Applicant)",
    id: "361a89a7-787d-4276-ba6d-fa37ed6dd466",
    role: "APPLICANT",
  },
  {
    key: "bob",
    label: "Bob (Reviewer)",
    id: "51ec1470-a403-4f5c-ac49-d523ae9ec275",
    role: "REVIEWER",
  },
];

function App() {
  const [activeUserKey, setActiveUserKey] = useState<MockUser["key"]>("alice");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeUser = useMemo(
    () => users.find((user) => user.key === activeUserKey) ?? users[0],
    [activeUserKey],
  );

  const loadApplications = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getApplications(activeUser);
      setApplications(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load applications from backend.",
      );
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, [activeUser]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#ffe4d9,transparent_45%),radial-gradient(circle_at_85%_15%,#d2f5e3,transparent_35%),linear-gradient(180deg,#f8fafc,#f3f4f6)]">
      <Header
        activeUserKey={activeUserKey}
        users={users}
        onUserChange={setActiveUserKey}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-300/70 bg-white/85 px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            Active Role: {activeUser.role}
          </p>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700"
            onClick={() => void loadApplications()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {activeUser.role === "APPLICANT" ? (
          <ApplicantDashboard
            user={activeUser}
            applications={applications}
            loading={loading}
            onDataChanged={loadApplications}
            onError={setErrorMessage}
          />
        ) : (
          <ReviewerDashboard
            user={activeUser}
            applications={applications}
            loading={loading}
            onDataChanged={loadApplications}
            onError={setErrorMessage}
          />
        )}
      </main>
    </div>
  );
}

export default App;

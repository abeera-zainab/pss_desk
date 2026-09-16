import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { CaseDTO } from "@shared/types";
import { api, apiError } from "../lib/api";
import { ErrorText, Spinner } from "../components/ui";
import { CaseFilePreview } from "../components/caseFiles/CaseFilePreview";

export default function CaseReportViewer() {
  const { id, fileId } = useParams();
  const navigate = useNavigate();
  const [kase, setKase] = useState<CaseDTO | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .getCase(id)
      .then(setKase)
      .catch((e) => setError(apiError(e)));
  }, [id]);

  const file = kase?.files?.find((f) => f.id === fileId);

  if (error) {
    return (
      <div className="p-10">
        <ErrorText message={error} />
        <Link to="/cases" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Back to cases
        </Link>
      </div>
    );
  }
  if (!kase) return <Spinner />;
  if (!file) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-8">
        <p className="text-sm font-semibold text-slate-700">Report not found in this case</p>
        <button type="button" className="text-sm text-indigo-600 hover:underline" onClick={() => navigate(`/cases/${kase.id}`)}>
          Return to case
        </button>
      </div>
    );
  }

  return <CaseFilePreview file={file} onClose={() => navigate(`/cases/${kase.id}`)} />;
}

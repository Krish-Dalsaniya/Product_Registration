import { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function PayslipDownload() {
  const { payrollId } = useParams();

  useEffect(() => {
    window.location.href =
      `/api/hr/payrolls/download/${payrollId}`;
  }, [payrollId]);

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Preparing Payslip...</h2>
      <p>Your download will begin automatically.</p>
    </div>
  );
}

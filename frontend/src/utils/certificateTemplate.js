import { LOGO_BASE64 } from './logoBase64';

export const getCertificateHtml = (assignment) => {
    const completedDate = new Date(assignment.completed_at || new Date()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
    <style>
        .cert-container {
            background-color: #ffffff;
            font-family: "Times New Roman", Times, serif;
            width: 297mm;
            height: 210mm;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
            padding: 48px;
        }
        .outer-border {
            position: absolute;
            top: 20px; left: 20px; right: 20px; bottom: 20px;
            border: 4px solid #0f172a;
            z-index: 1;
        }
        .inner-border {
            position: absolute;
            top: 30px; left: 30px; right: 30px; bottom: 30px;
            border: 1px solid #0f172a;
            z-index: 1;
        }
        .content-wrapper {
            position: relative;
            z-index: 2;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            text-align: center;
            background: #ffffff;
            padding-top: 10px;
        }
        .header-logo {
            margin-top: 15px;
            margin-bottom: 25px;
        }
        .header-logo img {
            height: 70px;
            width: auto;
            object-fit: contain;
        }
        .middle-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 100%;
        }
        .cert-title {
            font-size: 50px;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 5px;
            margin: 0;
            margin-bottom: 35px;
            border-bottom: 2px solid #cbd5e1;
            padding-bottom: 12px;
            display: inline-block;
        }
        .cert-text {
            font-size: 20px;
            font-style: italic;
            color: #64748b;
            margin-bottom: 15px;
        }
        .employee-name {
            font-size: 56px;
            font-weight: bold;
            color: #0f172a;
            font-family: "Georgia", serif;
            margin: 15px 0 20px 0;
            text-transform: capitalize;
            letter-spacing: 1px;
        }
        .course-name {
            font-size: 32px;
            font-weight: bold;
            color: #1e293b;
            margin: 25px auto;
            max-width: 850px;
            line-height: 1.4;
            font-family: "Georgia", serif;
        }
        .date-text {
            font-size: 18px;
            color: #475569;
            margin-top: 25px;
        }
        .footer-section {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 0 50px;
            box-sizing: border-box;
            margin-bottom: 20px;
            margin-top: auto;
        }
        .signature-block {
            width: 250px;
            text-align: center;
        }
        .signature-line {
            border-bottom: 1px solid #334155;
            padding-bottom: 5px;
            margin-bottom: 12px;
            height: 50px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
        }
        .signature-text {
            font-family: "Brush Script MT", cursive, serif;
            font-size: 40px;
            color: #1e293b;
            display: inline-block;
            margin-bottom: -8px;
        }
        .sig-name {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin: 0 0 6px 0;
            font-family: Arial, sans-serif;
        }
        .sig-title {
            font-size: 13px;
            color: #64748b;
            margin: 0;
            font-family: Arial, sans-serif;
        }
        .badge {
            width: 125px;
            height: 125px;
            background-color: #f8fafc;
            border: 2px solid #cbd5e1;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 5px #ffffff, 0 0 0 7px #cbd5e1;
            margin: 0 20px;
        }
        .badge-inner {
            font-size: 11px;
            font-family: Arial, sans-serif;
            color: #64748b;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: bold;
            line-height: 1.4;
        }
        .badge-star {
            font-size: 26px;
            color: #0f172a;
            margin: 4px 0;
        }
    </style>
    <div class="cert-container">
        <div class="outer-border"></div>
        <div class="inner-border"></div>
        <div class="content-wrapper">
            
            <div class="header-logo">
                <img src="${LOGO_BASE64}" alt="Company Logo" />
            </div>

            <div class="middle-content">
                <h1 class="cert-title">Certificate of Completion</h1>
                
                <div class="cert-text">This is proudly presented to</div>
                
                <h2 class="employee-name">${assignment.employee_name}</h2>
                
                <div class="cert-text">for successfully completing the training module</div>
                
                <h3 class="course-name">${assignment.module_title}</h3>
                
                <div class="date-text">Awarded on <strong>${completedDate}</strong></div>
            </div>

            <div class="footer-section">
                <div class="signature-block">
                    <div class="signature-line">
                        <span class="signature-text" style="transform: rotate(-3deg);">Mansi S.</span>
                    </div>
                    <p class="sig-name">Mansi Shah</p>
                    <p class="sig-title">Chief Executive Officer</p>
                </div>
                
                <div class="badge">
                    <div class="badge-inner">Official</div>
                    <div class="badge-star">★</div>
                    <div class="badge-inner">Document</div>
                </div>

                <div class="signature-block">
                    <div class="signature-line">
                        <span class="signature-text" style="transform: rotate(-2deg);">Mihir P.</span>
                    </div>
                    <p class="sig-name">Mihir Patel</p>
                    <p class="sig-title">Director</p>
                </div>
            </div>
        </div>
    </div>
    `;
};

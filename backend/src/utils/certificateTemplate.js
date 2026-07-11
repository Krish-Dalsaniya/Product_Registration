const getCertificateHtml = (name, previousRole, targetRole, dateStr) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Certificate of Completion</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .certificate-container {
            width: 800px;
            height: 600px;
            background-color: white;
            border: 20px solid #1e3a8a;
            padding: 40px;
            box-sizing: border-box;
            position: relative;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .border-inner {
            border: 2px solid #e5e7eb;
            height: 100%;
            padding: 30px;
            box-sizing: border-box;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 40px;
        }
        .title {
            font-size: 48px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 4px;
        }
        .subtitle {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 40px;
        }
        .name {
            font-size: 42px;
            font-weight: bold;
            color: #1d4ed8;
            margin-bottom: 30px;
            font-family: 'Georgia', serif;
            border-bottom: 2px solid #d1d5db;
            display: inline-block;
            padding: 0 40px 10px;
        }
        .description {
            font-size: 20px;
            color: #374151;
            line-height: 1.6;
            margin: 0 40px 50px;
        }
        .footer {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            padding: 0 40px;
        }
        .signature-block {
            text-align: center;
        }
        .signature-line {
            width: 200px;
            border-top: 1px solid #000;
            margin-bottom: 10px;
        }
        .date-line {
            width: 150px;
            border-top: 1px solid #000;
            margin-bottom: 10px;
        }
        .stamp {
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 100px;
            border: 4px solid #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ef4444;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            transform: translateX(-50%) rotate(-15deg);
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="border-inner">
            <div class="logo">LIPL Group</div>
            <div class="title">Certificate of Completion</div>
            <div class="subtitle">This certificate is proudly presented to</div>
            
            <div class="name">${name}</div>
            
            <div class="description">
                For successfully completing the program as an <strong>${previousRole}</strong>. 
                <br/><br/>
                We are pleased to announce your promotion to <strong>${targetRole}</strong>, effective immediately.
            </div>
            
            <div class="footer">
                <div class="signature-block">
                    <div class="date-line"></div>
                    <div>Date: <strong>${dateStr}</strong></div>
                </div>
                
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div>Authorized Signature</div>
                </div>
            </div>
            
            <div class="stamp">OFFICIAL<br/>APPROVED</div>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = { getCertificateHtml };

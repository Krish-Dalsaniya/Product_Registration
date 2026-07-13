import { LOGO_BASE64 } from './logoBase64';

export const getCertificateHtml = (assignment) => {
    const completedDate = new Date(assignment.completed_at || new Date()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const duration = assignment.duration_hours ? `${assignment.duration_hours} Hours` : 'N/A';
    
    let grade = 'Completed';
    if (assignment.highest_score !== null && assignment.highest_score !== undefined) {
        if (assignment.highest_score >= 90) grade = 'Distinction';
        else if (assignment.highest_score >= 75) grade = 'Pass';
        else grade = 'Completed';
    }

    // Verify URL for QR Code
    const verifyUrl = `${window.location.origin}/verify/${assignment.assignment_id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

    return `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Great+Vibes&family=Montserrat:wght@400;600;700&display=swap');

        .cert-container {
            width: 297mm;
            height: 210mm;
            background: #fdfbf7;
            position: relative;
            padding: 15mm;
            box-sizing: border-box;
            overflow: hidden;
        }

        /* Borders */
        .border-outer {
            position: absolute;
            top: 15px; left: 15px; right: 15px; bottom: 15px;
            border: 4px solid #061c3f; /* Navy */
            z-index: 1;
        }
        .border-inner {
            position: absolute;
            top: 25px; left: 25px; right: 25px; bottom: 25px;
            border: 2px solid #d4af37; /* Gold */
            z-index: 2;
        }

        /* Corner accents */
        .corner {
            position: absolute;
            width: 120px;
            height: 120px;
            background: #061c3f;
            z-index: 10;
        }
        .corner-tl { top: -60px; left: -60px; transform: rotate(45deg); border-bottom: 4px solid #d4af37; }
        .corner-tr { top: -60px; right: -60px; transform: rotate(-45deg); border-bottom: 4px solid #d4af37; }
        .corner-bl { bottom: -60px; left: -60px; transform: rotate(-45deg); border-top: 4px solid #d4af37; }
        .corner-br { bottom: -60px; right: -60px; transform: rotate(45deg); border-top: 4px solid #d4af37; }

        .content {
            position: relative;
            z-index: 20;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            background: #fff;
            padding: 20px 40px;
            box-sizing: border-box;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.02);
        }

        .logo {
            height: 60px;
            margin-top: 10px;
            margin-bottom: 15px;
            object-fit: contain;
        }

        .title {
            font-family: 'Cinzel', serif;
            font-size: 46px;
            color: #061c3f;
            letter-spacing: 10px;
            margin: 0 0 5px 0;
            text-transform: uppercase;
        }

        .subtitle {
            font-family: 'Montserrat', sans-serif;
            font-size: 16px;
            color: #d4af37;
            letter-spacing: 6px;
            text-transform: uppercase;
            margin-bottom: 35px;
            position: relative;
            display: inline-block;
        }
        .subtitle::before, .subtitle::after {
            content: "";
            position: absolute;
            top: 50%;
            width: 100px;
            height: 1.5px;
            background: #d4af37;
        }
        .subtitle::before { left: -120px; }
        .subtitle::after { right: -120px; }

        .presented-to {
            font-family: 'Montserrat', sans-serif;
            font-size: 13px;
            color: #061c3f;
            letter-spacing: 3px;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .name {
            font-family: 'Great Vibes', cursive;
            font-size: 80px;
            color: #061c3f;
            margin: 0 0 25px 0;
            line-height: 1;
            padding-bottom: 10px;
            border-bottom: 1px solid #d4af37;
            display: inline-block;
            min-width: 600px;
        }

        .reason {
            font-family: 'Montserrat', sans-serif;
            font-size: 15px;
            color: #444;
            margin-bottom: 15px;
            font-weight: 600;
        }

        .course-badge {
            background: #061c3f;
            color: #ffffff;
            font-family: 'Cinzel', serif;
            font-size: 24px;
            padding: 12px 50px;
            border: 2px solid #d4af37;
            margin-bottom: 40px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            text-transform: uppercase;
            letter-spacing: 3px;
            max-width: 800px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .stats-container {
            display: flex;
            justify-content: center;
            gap: 50px;
            margin-bottom: 40px;
            width: 100%;
        }

        .stat-box {
            display: flex;
            align-items: center;
            gap: 15px;
            text-align: left;
        }

        .stat-icon {
            width: 45px;
            height: 45px;
            background: #061c3f;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #d4af37;
            border: 1px solid #d4af37;
        }

        .stat-icon svg {
            width: 22px;
            height: 22px;
        }

        .stat-text-label {
            font-family: 'Montserrat', sans-serif;
            font-size: 11px;
            font-weight: 700;
            color: #061c3f;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }

        .stat-text-value {
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
            color: #333;
            font-weight: 600;
        }

        .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            width: 100%;
            margin-top: auto;
            padding: 0 20px;
        }

        .signature {
            text-align: center;
            width: 220px;
        }

        .signature-img {
            font-family: 'Great Vibes', cursive;
            font-size: 38px;
            color: #061c3f;
            margin-bottom: -5px;
        }

        .signature-line {
            border-top: 1px solid #061c3f;
            padding-top: 8px;
        }

        .signature-name {
            font-family: 'Montserrat', sans-serif;
            font-size: 13px;
            font-weight: 700;
            color: #061c3f;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .signature-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 11px;
            color: #666;
            margin-top: 2px;
        }

        .seal-container {
            position: relative;
            width: 140px;
            height: 140px;
            margin-bottom: -20px; /* Overlap bottom slightly */
        }

        .seal {
            width: 140px;
            height: 140px;
            background: linear-gradient(135deg, #e5c058 0%, #aa801b 100%);
            border-radius: 50%;
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed #fff;
            box-shadow: 0 0 0 6px #d4af37, 0 8px 20px rgba(0,0,0,0.3);
        }

        .seal-inner {
            width: 110px;
            height: 110px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.6);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        
        .seal-text {
            color: #fff;
            font-family: 'Montserrat', sans-serif;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }

        .seal-logo {
            height: 35px;
            filter: brightness(0) invert(1);
            margin: 4px 0;
            drop-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }

        .ribbon {
            position: absolute;
            bottom: -35px;
            width: 36px;
            height: 70px;
            background: #061c3f;
            z-index: 1;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .ribbon-left { left: 25px; transform: rotate(20deg); }
        .ribbon-right { right: 25px; transform: rotate(-20deg); }
        .ribbon::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            border-left: 18px solid transparent;
            border-right: 18px solid transparent;
            border-bottom: 18px solid #fff;
        }
        
        .qr-box {
            display: flex;
            align-items: center;
            gap: 15px;
            text-align: left;
            width: 220px;
            justify-content: flex-end;
        }
        .qr-text {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .qr-text-label {
            font-family: 'Montserrat', sans-serif;
            font-size: 11px;
            font-weight: 700;
            color: #061c3f;
            letter-spacing: 1px;
        }
        .qr-text-value {
            font-family: 'Montserrat', sans-serif;
            font-size: 9px;
            color: #666;
            margin-top: 2px;
            text-align: right;
        }
        .qr-code {
            width: 60px;
            height: 60px;
            background: #fff;
            border: 1px solid #cbd5e1;
            padding: 3px;
            border-radius: 4px;
        }
    </style>
    <div class="cert-container">
        <div class="border-outer"></div>
        <div class="border-inner"></div>
        
        <div class="corner corner-tl"></div>
        <div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div>
        <div class="corner corner-br"></div>

        <div class="content">
            <img src="${LOGO_BASE64}" class="logo" alt="Logo" />
            
            <h1 class="title">Certificate</h1>
            <div class="subtitle">Of Completion</div>
            
            <div class="presented-to">PROUDLY PRESENTED TO</div>
            
            <h2 class="name">${assignment.employee_name}</h2>
            
            <div class="reason">For successfully completing the</div>
            
            <div class="course-badge">${assignment.module_title}</div>
            
            <div class="stats-container">
                <div class="stat-box">
                    <div class="stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <div>
                        <div class="stat-text-label">DATE OF COMPLETION</div>
                        <div class="stat-text-value">${completedDate}</div>
                    </div>
                </div>
                
                <div class="stat-box">
                    <div class="stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div>
                        <div class="stat-text-label">DURATION</div>
                        <div class="stat-text-value">${duration}</div>
                    </div>
                </div>

                <div class="stat-box">
                    <div class="stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                    </div>
                    <div>
                        <div class="stat-text-label">GRADE</div>
                        <div class="stat-text-value">${grade}</div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <div class="signature">
                    <div class="signature-img">Mihir Patel</div>
                    <div class="signature-line">
                        <div class="signature-name">MIHIR PATEL</div>
                        <div class="signature-title">Managing Director</div>
                    </div>
                </div>

                <div class="seal-container">
                    <div class="ribbon ribbon-left"></div>
                    <div class="ribbon ribbon-right"></div>
                    <div class="seal">
                        <div class="seal-inner">
                            <div class="seal-text">LEON'S</div>
                            <img src="${LOGO_BASE64}" class="seal-logo" alt="Seal Logo" />
                            <div class="seal-text">INTEGRATIONS</div>
                        </div>
                    </div>
                </div>

                <div class="qr-box">
                    <div class="qr-text">
                        <div class="qr-text-label">VERIFY CERTIFICATE</div>
                        <div class="qr-text-value">Scan the QR code to<br/>verify authenticity</div>
                    </div>
                    <img src="${qrUrl}" class="qr-code" alt="QR Code" />
                </div>
            </div>
        </div>
    </div>
    `;
};

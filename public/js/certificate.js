const CertificateEngine = {
  renderCanvas(certData, canvasId = 'certificateCanvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 1200;
    const height = 850;

    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#070a12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Outer & Inner Gold Borders
    const padding = 35;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

    const innerPadding = 48;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(innerPadding, innerPadding, width - innerPadding * 2, height - innerPadding * 2);

    // Corner Ornaments
    const corners = [
      [padding, padding],
      [width - padding, padding],
      [padding, height - padding],
      [width - padding, height - padding]
    ];
    corners.forEach(([x, y]) => {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Top Seal Badge
    ctx.save();
    ctx.translate(width / 2, 110);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 0);
    ctx.restore();

    // 4. Header Titles
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('WEDIGO CAREERS ACADEMY', width / 2, 170);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 36px Outfit, sans-serif';
    ctx.fillText('CERTIFICATE OF INTERNSHIP & COMPLETION', width / 2, 220);

    // Subheader line
    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillText('THIS IS PROUDLY PRESENTED TO', width / 2, 275);

    // 5. Recipient Name
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 46px "Playfair Display", Georgia, serif';
    ctx.fillText(certData.user_name || 'STUDENT NAME', width / 2, 340);

    // Underline flourish for name
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 200, 360);
    ctx.lineTo(width / 2 + 200, 360);
    ctx.stroke();

    // 6. Course Title & Description
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '400 18px Inter, sans-serif';
    ctx.fillText('for successfully completing the rigorous training program and curriculum for', width / 2, 410);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(certData.course_title || 'COURSE TITLE', width / 2, 460);

    // Start Date & Completion Date Line
    const startDateText = certData.start_date || certData.issue_date || 'August 01, 2026';
    const endDateText = certData.completion_date || certData.issue_date || 'August 12, 2026';

    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 15px Inter, sans-serif';
    ctx.fillText(`Duration: ${certData.course_duration || '8 Weeks'}   |   Start Date: ${startDateText}   |   Completion Date: ${endDateText}`, width / 2, 505);

    // 7. Metadata Footer Info
    ctx.fillStyle = '#64748b';
    ctx.font = '600 14px monospace';
    ctx.fillText(`Certificate ID: ${certData.certificate_id || 'CERT-2026-DEMO'}  |  Passing Score: ${certData.score || 100}%`, width / 2, 545);

    // 8. Signatures & QR Code Section
    const bottomY = 670;

    // Left Signature - Neethu Allampati
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(220, bottomY);
    ctx.lineTo(440, bottomY);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'italic 26px "Great Vibes", cursive, Georgia';
    ctx.fillText(certData.signatory_name || 'Neethu Allampati', 330, bottomY - 15);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 15px Outfit, sans-serif';
    ctx.fillText(certData.signatory_name || 'Neethu Allampati', 330, bottomY + 25);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '400 13px Inter, sans-serif';
    ctx.fillText(certData.signatory_title || 'Director of Academics', 330, bottomY + 45);

    // Right QR Code & Verification Box
    const qrSize = 110;
    const qrX = width - 400;
    const qrY = bottomY - 70;

    // QR Box Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);

    // Dynamic Verification URL for QR Code
    const verifyUrl = `${window.location.origin}/verify.html?id=${encodeURIComponent(certData.certificate_id)}`;

    // Draw QR Code Image into box
    const qrImg = new Image();
    qrImg.crossOrigin = 'Anonymous';
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(verifyUrl)}`;
    
    qrImg.onload = () => {
      ctx.drawImage(qrImg, qrX + 5, qrY + 5, qrSize - 10, qrSize - 10);
    };

    // Label below QR Code
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 20);
    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px Inter, sans-serif';
    ctx.fillText('Authentic Database Record', qrX + qrSize / 2, qrY + qrSize + 36);
  },

  downloadPNG(certId) {
    const canvas = document.getElementById('certificateCanvas');
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Certificate-${certId}.png`;
    link.href = image;
    link.click();
  }
};

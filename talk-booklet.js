/* SAVE THE MOVE · final casebook PDF download */
(() => {
  const button=document.getElementById('talkBookletLink');
  const pending=document.getElementById('talkBookletPending');
  if(!button||!pending)return;

  const source=String(window.SAVE_THE_MOVE_CASEBOOK_PDF_URL||'').trim();
  if(!source)return;

  let url='';
  let crossOrigin=false;
  const driveFile=source.match(/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)(?:[/?#]|$)/);
  const driveOpen=source.match(/^https:\/\/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/);
  const driveId=(driveFile&&driveFile[1])||(driveOpen&&driveOpen[1]);
  if(driveId){
    // Google's file-download endpoint. Requires link-viewer access to the PDF.
    url='https://drive.google.com/uc?export=download&id='+encodeURIComponent(driveId);
    crossOrigin=true;
  } else if(/^https:\/\//.test(source)){
    try {
      const parsed=new URL(source);
      if(['https:'].includes(parsed.protocol)){
        url=parsed.href;
        crossOrigin=parsed.origin!==location.origin;
      }
    } catch(error){}
  } else if(/^assets\/[A-Za-z0-9_\-./%]+\.pdf(?:\?.*)?$/.test(source) && !source.includes('..')){
    url=source;
  }

  if(!url)return;
  button.href=url;
  if(crossOrigin){
    // HTML download is not honored across origins; the Drive endpoint may
    // request confirmation for very large files.
    button.removeAttribute('download');
    button.target='_blank';
    button.rel='noopener noreferrer';
  } else {
    button.download='2026_SAVE_THE_MOVE_실천사례집.pdf';
  }
  button.hidden=false;
  pending.hidden=true;
})();

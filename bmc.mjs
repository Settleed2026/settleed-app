// Settleed BMC Slides Generator
// Run: npm install pptxgenjs && node bmc.mjs
import pptxgen from 'pptxgenjs';

const pres = new pptxgen();

const NAVY='1B3A6B', GREEN='1D9E75', WHITE='FFFFFF';
const AMBER_BG='FFF3CD', AMBER_LINE='E6B800', AMBER_TEXT='7A5800';
const REMOVED_BG='EBEBEB', REMOVED_TEXT='999999';
const DARK='222222', BORDER='CCCCCC', BLOCK_BG='F7FAFF', VP_BG='FAFFF8';

// Layout constants (10" x 5.625" canvas)
const ML=0.10, GRID_TOP=0.46, GRID_W=9.80;
const MAIN_H=3.55, BOT_H=1.22, ROW_H=MAIN_H/2;
const ROW1_Y=GRID_TOP, ROW2_Y=GRID_TOP+ROW_H, BOT_Y=GRID_TOP+MAIN_H;

const KP_W=1.82, KA_W=1.42, VP_W=1.92, CR_W=1.42;
const CS_W=GRID_W-KP_W-KA_W-VP_W-CR_W;
const KP_X=ML, KA_X=KP_X+KP_W, VP_X=KA_X+KA_W, CR_X=VP_X+VP_W, CS_X=CR_X+CR_W;

const COST_W=GRID_W*0.36, REV_W=GRID_W-COST_W, COST_X=ML, REV_X=ML+COST_W;
const S2_COST_W=3.20, S2_REV_W=2.80, S2_DISC_W=GRID_W-S2_COST_W-S2_REV_W;
const S2_COST_X=ML, S2_REV_X=ML+S2_COST_W, S2_DISC_X=S2_REV_X+S2_REV_W;

function titleBar(slide, text, bg) {
  slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:10, h:0.43, fill:{color:bg||NAVY} });
  slide.addText(text, { x:0, y:0, w:10, h:0.43, fontSize:13, bold:true, color:WHITE,
    align:'center', valign:'middle', isTextBox:true, margin:0 });
}

function block(slide, x, y, w, h, header, lines, opts={}) {
  const { bg=BLOCK_BG, hColor=NAVY, removed=false, badge=null } = opts;

  slide.addShape(pres.ShapeType.rect, {
    x, y, w, h,
    fill: { color: removed ? REMOVED_BG : bg },
    line: { color: BORDER, width: 0.75 }
  });

  const labelW = badge ? w-0.35 : w-0.10;
  slide.addText(header, {
    x:x+0.06, y:y+0.04, w:labelW, h:0.20,
    fontSize:7, bold:true, color:removed?REMOVED_TEXT:hColor,
    isTextBox:true, margin:0
  });

  if (badge && !removed) {
    slide.addShape(pres.ShapeType.ellipse, {
      x:x+w-0.30, y:y+0.03, w:0.24, h:0.18, fill:{color:GREEN}
    });
    slide.addText(badge, {
      x:x+w-0.30, y:y+0.03, w:0.24, h:0.18,
      fontSize:5.5, bold:true, color:WHITE,
      align:'center', valign:'middle', isTextBox:true, margin:0
    });
  }

  const cy=y+0.27, ch=h-0.30;

  if (removed) {
    slide.addText('— not validated\n    by interviews', {
      x:x+0.06, y:cy, w:w-0.12, h:ch,
      fontSize:6, italic:true, color:REMOVED_TEXT,
      align:'center', valign:'middle', isTextBox:true, margin:0
    });
    return;
  }

  if (!lines || lines.length === 0) return;

  const paras = lines.map((ln, i) => ({
    text: '• '+ln,
    options: { fontSize:6, color:DARK, breakLine:i<lines.length-1, paraSpaceAfter:1.2 }
  }));
  slide.addText(paras, { x:x+0.06, y:cy, w:w-0.12, h:ch, isTextBox:true, margin:0, valign:'top' });
}

function vpContent(slide, y1) {
  slide.addText([
    {text:'FOR TENANTS', options:{fontSize:6.5,bold:true,color:NAVY,breakLine:true}},
    {text:'• Pre-screened voucher-accepting landlords', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• RFTA status tracker (no "black hole" waits)', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• Voucher math / tenant portion calculator', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:4}},
    {text:'FOR LANDLORDS', options:{fontSize:6.5,bold:true,color:NAVY,breakLine:true}},
    {text:'• Verified HCV tenant pool', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• Expedited RFTA portal — fewer vacancy days', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• Pre-inspection digital checklist', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:4}},
    {text:'FOR AGENCIES', options:{fontSize:6.5,bold:true,color:NAVY,breakLine:true}},
    {text:'• Case manager pipeline dashboard', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• Digital document vault & multi-agency routing', options:{fontSize:6,color:DARK,breakLine:false}},
  ], { x:VP_X+0.06, y:y1+0.27, w:VP_W-0.12, h:MAIN_H-0.30, isTextBox:true, margin:0, valign:'top' });
}

function vpStripped(slide, y1) {
  slide.addText([
    {text:'FOR TENANTS', options:{fontSize:6.5,bold:true,color:NAVY,breakLine:true}},
    {text:'• Pre-screened landlords  [3+]', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• RFTA status tracker  [1+]', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• Voucher math calculator  [1+]', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:4}},
    {text:'FOR LANDLORDS', options:{fontSize:6.5,bold:true,color:NAVY,breakLine:true}},
    {text:'• Expedited RFTA portal  [2+]', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• Pre-inspection checklist  [2+]', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• Tenant pre-screening badge  [1+]', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:4}},
    {text:'FOR AGENCIES', options:{fontSize:6.5,bold:true,color:NAVY,breakLine:true}},
    {text:'• Case manager dashboard  [2+]', options:{fontSize:6,color:DARK,breakLine:true,paraSpaceAfter:1}},
    {text:'• Digital document vault  [1+]', options:{fontSize:6,color:DARK,breakLine:false}},
  ], { x:VP_X+0.06, y:y1+0.27, w:VP_W-0.12, h:MAIN_H-0.30, isTextBox:true, margin:0, valign:'top' });
}

// ════════════════════════════════════════
// SLIDE 1 — Full BMC
// ════════════════════════════════════════
const s1 = pres.addSlide();
s1.background = { color: WHITE };
titleBar(s1, 'Settleed  ·  Business Model Canvas  ·  Full View');

block(s1,KP_X,ROW1_Y,KP_W,MAIN_H,'KEY PARTNERS',[
  'Housing Authorities (AHA, DCA)','County HAs (Cobb, DeKalb)',
  'HQS Inspection Contractors','Background Check: Checkr / SmartMove',
  'Vercel · Supabase · SendGrid']);
block(s1,KA_X,ROW1_Y,KA_W,ROW_H,'KEY ACTIVITIES',[
  'Landlord acquisition & verification','Listing review & admin approval',
  'Tenant–landlord matching','Pre-inspection checklist delivery','Agency partnership development']);
block(s1,KA_X,ROW2_Y,KA_W,ROW_H,'KEY RESOURCES',[
  'Live platform — settleed.com','Founder AHA insider network & credibility',
  'Verified landlord directory','119-interview primary research dataset']);
block(s1,VP_X,ROW1_Y,VP_W,MAIN_H,'VALUE PROPOSITIONS',[],{bg:VP_BG});
vpContent(s1, ROW1_Y);
block(s1,CR_X,ROW1_Y,CR_W,ROW_H,'CUSTOMER RELATIONSHIPS',[
  'Self-serve platform','Admin-verified listings (trust layer)',
  'In-app fraud-filtered messaging','Email status notifications']);
block(s1,CR_X,ROW2_Y,CR_W,ROW_H,'CHANNELS',[
  'Agency referrals (AHA / DCA)','Church & investor meetup outreach',
  'Section 8 Facebook groups','SEO / organic search']);
block(s1,CS_X,ROW1_Y,CS_W,MAIN_H,'CUSTOMER SEGMENTS',[
  'Voucher-Holding Tenants (HCV holders)','Mom-and-Pop Landlords (1–10 units)',
  'Small Portfolio Operators (10–50 units)','Housing Specialists & Case Managers',
  'HQS Inspectors (indirect)']);
block(s1,COST_X,BOT_Y,COST_W,BOT_H,'COST STRUCTURE',[
  'Infrastructure: Vercel + Supabase + SendGrid',
  'Founder time (primary cost)','Outreach and marketing']);
block(s1,REV_X,BOT_Y,REV_W,BOT_H,'REVENUE STREAMS',[
  'Currently: FREE — Early Access (no subscription, no payment)',
  'Planned: Landlord SaaS subscription (post lease-up proof)',
  'Planned: Success fee per verified lease-up',
  'Planned: Housing authority consultation services']);

// ════════════════════════════════════════
// SLIDE 2 — Evidence-Stripped BMC
// ════════════════════════════════════════
const s2 = pres.addSlide();
s2.background = { color: WHITE };
titleBar(s2,'Settleed  ·  BMC — Interview Evidence Only  ·  [ n ] = # interviews supporting this item','1D3557');

block(s2,KP_X,ROW1_Y,KP_W,MAIN_H,'KEY PARTNERS',[
  'HQS Inspection Contractors','  (scheduling integration validated)',
  'Housing Authorities','  (referral & RFTA workflow validated)'],{badge:'4+'});
block(s2,KA_X,ROW1_Y,KA_W,ROW_H,'KEY ACTIVITIES',[
  'Landlord identity verification','RFTA facilitation portal',
  'Listing review & approval'],{badge:'5+'});
block(s2,KA_X,ROW2_Y,KA_W,ROW_H,'KEY RESOURCES',[
  'Founder AHA insider credibility','119-interview primary research',
  '(Platform value — not directly tested)'],{badge:'2+'});
block(s2,VP_X,ROW1_Y,VP_W,MAIN_H,'VALUE PROPOSITIONS',[],{bg:VP_BG});
vpStripped(s2, ROW1_Y);
block(s2,CR_X,ROW1_Y,CR_W,ROW_H,'CUSTOMER RELATIONSHIPS',[],{removed:true});
block(s2,CR_X,ROW2_Y,CR_W,ROW_H,'CHANNELS',[
  'Agency referrals (AHA / DCA)','  Case managers route clients here',
  '(Other channels = untested assumption)'],{badge:'2+'});
block(s2,CS_X,ROW1_Y,CS_W,MAIN_H,'CUSTOMER SEGMENTS',[
  'Voucher-Holding Tenants  [3+]','Mom-and-Pop Landlords  [2+]',
  'Small Portfolio Operators  [2+]','Housing Agency Staff  [2+]'],{badge:'9+'});
block(s2,S2_COST_X,BOT_Y,S2_COST_W,BOT_H,'COST STRUCTURE',[],{removed:true});
block(s2,S2_REV_X,BOT_Y,S2_REV_W,BOT_H,'REVENUE STREAMS',[],{removed:true});

// Disconfirming signal box
s2.addShape(pres.ShapeType.rect, {
  x:S2_DISC_X, y:BOT_Y, w:S2_DISC_W, h:BOT_H,
  fill:{color:AMBER_BG}, line:{color:AMBER_LINE,width:1}
});
s2.addText([
  {text:'DISCONFIRMING SIGNAL  ', options:{bold:true,fontSize:7,color:AMBER_TEXT,breakLine:false}},
  {text:'count: [  X  ]', options:{bold:true,fontSize:7,color:'CC3300',breakLine:true}},
  {text:'Some landlords said they would NOT use a marketplace — they prefer direct referrals or word of mouth. Fill in X with your honest count before Friday. If X is high relative to your total landlord interviews, your channel assumption needs rethinking before November.',
    options:{fontSize:6,color:AMBER_TEXT,breakLine:false}},
], { x:S2_DISC_X+0.10, y:BOT_Y+0.08, w:S2_DISC_W-0.18, h:BOT_H-0.16,
     isTextBox:true, margin:0, valign:'top' });

await pres.writeFile({ fileName: 'Settleed_BMC_Evidence.pptx' });
console.log('Done! File saved as Settleed_BMC_Evidence.pptx');

export const MODES = ['tank', 'heli', 'boat', 'combined'];
export const MODE_NAMES = { tank: 'الدبابة', heli: 'الهليكوبتر', boat: 'السفينة', combined: 'القوات المتكاملة' };
export const SECRET_STAGES = [
['731904','صقور الفجر','mountains','dawn','heli'],['582163','حارس الميناء','marsh','day','boat'],['946207','درع الصحراء','desert','sunset','tank'],['315879','عاصفة الثلج','ice','day','heli'],['824651','لؤلؤة الأهوار','marsh','sunset','boat'],['607432','حصار المدينة','city','night','tank'],['193768','أجنحة النخيل','palms','dawn','heli'],['459281','أسطول الليل','marsh','night','boat'],['268594','قلعة الجبال','mountains','sunset','tank'],['870325','عملية النصر','ruins','dawn','combined']
].map(([code,name,biome,time,mode],i)=>({code,name,biome,time,mode,level:10+i*3}));
export function vehicleFor(mode,level) { return mode === 'combined' ? ['tank','heli','boat'][(level-1)%3] : mode; }
export function resolveSecret(value) {
const digits=value.trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
return SECRET_STAGES.find(s=>s.code===digits)||null;
}

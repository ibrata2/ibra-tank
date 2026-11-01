export const ADVENTURE = Object.freeze({
  length: 5200, firstFuel: 420, firstPad: 920, secondPad: 1440,
  tankParking: 890, bikeStation: 980, bikeEnd: 1140, carStation: 1160, carEnd: 1420, secondFuel: 2100, alliedCamp: 2780, tankSwap: 3340,
  tankDeparture: 3700, bridgeStart: 4000, bridgeEnd: 4700, finish: 5120,
  cross: [4000, 4700],
});
export const CHAPTERS = Object.freeze([
  { id: 'intro', vehicle: 'soldier', view: 'hero', title: 'من داخل المقر إلى ساحة المعركة' },
  { id: 'tank-side', vehicle: 'tank', view: 'side', to: 420, kills: 3, fuel: 0, title: 'تقدم واقصف براميل الوقود' },
  { id: 'tank-advance', vehicle: 'tank', view: 'side', to: 896, kills: 6, title: 'تقدم إلى المهبط الأول' },
  { id: 'false-boarding', vehicle: 'soldier', view: 'hero', title: 'انتهى المسار البري — اقترب من الطائرة في المهبط الجانبي' },
  { id: 'infantry', vehicle: 'soldier', view: 'side', to: 980, kills: 4, title: 'تقدم راجلاً مسافة قصيرة تحت غطاء الحلفاء إلى الدراجة المنتظرة' },
  { id: 'board-bike', vehicle: 'soldier', view: 'hero', title: 'دراجة الإسناد وصلت وتنتظرك — اصعد وأكمل المهمة' },
  { id: 'bike-push', vehicle: 'bike', view: 'side', to: 1140, kills: 6, title: 'تقدم بالدراجة العسكرية مع إسناد الجيش إلى نقطة السيارة' },
  { id: 'board-car', vehicle: 'soldier', view: 'hero', title: 'التحق بالسيارة العسكرية ومعك جندي للإسناد' },
  { id: 'military-drive', vehicle: 'car', view: 'side', to: 1420, kills: 8, title: 'تقدم بالسيارة العسكرية مع الراكب والدراجات المساندة' },
  { id: 'board-heli', vehicle: 'soldier', view: 'hero', title: 'انتهى مسار السيارة — اتركها للإسناد الأرضي واصعد الطائرة الثانية' },
  { id: 'heli-assault', vehicle: 'heli', view: 'side', to: 2100, kills: 8, fuel: 1, title: 'إسناد جوي — دمر مستودع الوقود' },
  { id: 'heli-side', vehicle: 'heli', view: 'side', to: 2780, kills: 8, title: 'تقدم إلى تجمع القوات الصديقة' },
  { id: 'allied-boarding', vehicle: 'heli', view: 'hero', title: 'طاقم المقاتلات يلتحق بالدبابة الصديقة' },
  { id: 'joint-battle', vehicle: 'heli', view: 'side', to: 3340, kills: 12, title: 'هجوم مشترك مع الدبابة الحليفة' },
  { id: 'return-tank', vehicle: 'soldier', view: 'hero', title: 'اكتمل خط الطيران — هبوط واستلام الدبابة عند نقطة جانبية' },
  { id: 'tank-support', vehicle: 'tank', view: 'side', to: 3700, kills: 8, title: 'تقدم مع طاقم الدبابة الصديقة' },
  { id: 'air-support', vehicle: 'tank', view: 'side', to: 4000, kills: 8, title: 'الهليكوبتر الحليفة تؤمن الطريق إلى الجسر' },
  { id: 'bridge', vehicle: 'tank', view: 'side', to: 4700, kills: 14, title: 'اعبر الجسر مع إسناد السفينة في النهر' },
  { id: 'camp', vehicle: 'tank', view: 'side', to: 5120, kills: 10, title: 'تقدم إلى المعسكر الكبير' },
  { id: 'ending', vehicle: 'tank', view: 'hero', title: 'إذا هالتحديث عجبكم، كتبولنه تعليق بالتليكرام' },
]);
export const ADVENTURE_REGION = { name: 'عملية الرافدين — هدية الإصدار', gov: 'العراق', base: 'palms', time: 'sunset', features: ['road'], special: true };
export function bridgeHeight(x, base) {
  const { bridgeStart: a, bridgeEnd: b } = ADVENTURE;
  if (x < a - 28 || x > b + 28) return base;
  if (x < a) return base + (2.4 - base) * ((x - a + 28) / 28);
  if (x > b) return base + (2.4 - base) * ((b + 28 - x) / 28);
  return 2.4;
}

# Re-apply PRINT stack into the fresh clone

The customer-activities feature is already applied. This guide covers **printing**, which the
remote deleted. The print **files** are already copied in (src/utils/*, src/services/thermalPrint.ts,
android/.../pos/*.java). What's left: **re-wire 6 spots** + 1 type + 1 manifest block.

Each step is a small insertion. Do them in order, then run the typecheck at the end.

Legend:  ➕ = add this line/block.

---

## STEP 1 — `src/context/SettingsContext.tsx`  (the type the printer reads)

Find the `PrinterConfig` interface (around line 136). Inside it, ➕ add:

```ts
  commandMode?: 'epos-print' | 'escpos' | 'star-line';
```

(printBillThermal.ts reads `printer.commandMode`, so this field must exist.)

> Also check the DEFAULT printer settings object in this same file. If your build relied on a
> default `commandMode`, add it there too (optional — the field is optional).

---

## STEP 2 — `src/context/NotificationProvider.tsx`  (auto-print on new order)

This file already has the activity code. Add the print pieces:

**2a.** Near the top imports, ➕ add:
```ts
import { autoPrintOrder } from '../utils/autoPrintOrder';
```

**2b.** Make sure `useSettings()` also gives `formatCurrency`. Find:
```ts
const { settings } = useSettings();
```
change to:
```ts
const { settings, formatCurrency } = useSettings();
```

**2c.** After the `audioRef` ref declarations (near the top of the component), ➕ add:
```ts
// Hold latest printer settings + currency in a ref so socket handlers read fresh
// values WITHOUT being recreated (recreating would tear down the socket & miss orders).
const printCtxRef = useRef({ printer: settings.printer, autoPrint: settings.system?.autoPrint, formatCurrency });
useEffect(() => {
    printCtxRef.current = { printer: settings.printer, autoPrint: settings.system?.autoPrint, formatCurrency };
}, [settings.printer, settings.system?.autoPrint, formatCurrency]);
```

**2d.** Inside the `handleNewOrder` callback, right AFTER the line
`setNotifications(prev => [newNotif, ...prev].slice(0, 50));`, ➕ add:
```ts
// Auto-print KOT + bill on the restaurant device for ANY new order.
// autoPrintOrder dedupes by id so POS orders already printed won't double-print.
const { printer, autoPrint, formatCurrency: fmt } = printCtxRef.current;
if (isStaff && autoPrint) {
    const newOrderId = data.order?._id || data.orderId || data._id;
    if (newOrderId) {
        autoPrintOrder(newOrderId, printer, !!autoPrint, fmt)
            .catch(() => {
                toast.error('Auto-print failed. Check the printer Wi-Fi connection.');
            });
    }
}
```
> If the clone's `handleNewOrder` doesn't define `isStaff`, use the existing staff-role check it
> has (it determines who gets notified). The condition just needs to be "this is a staff device".

---

## STEP 3 — `src/components/PrintBillDialog.tsx`  (manual print bill)

**3a.** ➕ import:
```ts
import { printBillThermal } from '../utils/printBillThermal';
```

**3b.** In the print handler (where it builds `billData` and currently does browser/no print),
➕ call thermal first:
```ts
const printed = await printBillThermal(billData, settings.printer, formatCurrency);
// if (printed) return;   // skip the fallback browser print when thermal succeeded
```
> Place this where the dialog actually triggers printing. `billData`, `settings`, `formatCurrency`
> already exist in this component.

---

## STEP 4 — `src/pages/kitchen/KitchenInterface.tsx`  (KOT thermal print)

**4a.** ➕ import:
```ts
import { printKotThermal } from '../../utils/kotThermal';
```

**4b.** In the KOT print path, ➕:
```ts
const printed = await printKotThermal(order, settings.printer);
// if (printed) return;   // skip fallback when thermal succeeded
```

---

## STEP 5 — `src/pages/pos/POSPage.tsx`  (auto-print after POS order)

**5a.** ➕ import:
```ts
import { autoPrintOrder } from '../../utils/autoPrintOrder';
```

**5b.** After a POS order is created (where it has the new `orderId`), ➕:
```ts
await autoPrintOrder(orderId, settings.printer, settings.system.autoPrint, formatCurrency);
```

---

## STEP 6 — `src/pages/settings/SettingsPage.tsx`  (printer test + print-station toggle)

**6a.** ➕ imports:
```ts
import { printBillThermal } from '../../utils/printBillThermal';
import { isThermalPrintAvailable, startPrintStation, stopPrintStation } from '../../services/thermalPrint';
```

**6b.** Re-add the printer-test handler logic (uses `isThermalPrintAvailable()` guard +
`printBillThermal(sampleBill, { ...settings.printer, billing: config }, formatCurrency)`).

**6c.** Re-add the print-station start/stop calls (`startPrintStation({...})`, `stopPrintStation()`).

**6d.** Re-add the UI block guarded by `{isThermalPrintAvailable() && ( ... )}` for the
print-station controls.

> This is the biggest one. If unsure of exact placement, open your OLD version for reference:
> `git --git-dir=../reataurent/fe/.git show 33e4ad4:src/pages/settings/SettingsPage.tsx`
> and copy just the print-test + print-station sections.

---

## STEP 7 — `android/app/src/main/AndroidManifest.xml`

**7a.** Inside `<application>` (after the `<provider>` block), ➕:
```xml
<!-- Background print station foreground service -->
<service
    android:name="com.restaurant.pos.PrintStationService"
    android:exported="false"
    android:foregroundServiceType="dataSync"
/>
```

**7b.** With the other `<uses-permission>` entries, ➕:
```xml
<!-- Background print station -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## STEP 8 — Verify

```bash
npm install            # if not done; see note below about ERESOLVE
npx tsc --noEmit       # should report no NEW errors in print files / components
```

If `npm install` fails with **ERESOLVE** (peer dependency conflict), use:
```bash
npm install --legacy-peer-deps
```

Search for leftover broken imports:
```bash
git grep -nE "printBillThermal|autoPrintOrder|kotThermal|thermalPrint" -- src/ | grep -v "src/utils/\|src/services/"
```
Every hit should be in one of the 5 components above and resolve to a real import.

---

## Reference: exact original line numbers in YOUR old commit (for copy-paste)
- NotificationProvider: import L12, printCtxRef L70-73, auto-print block L312-318
- PrintBillDialog: import L28, call L79
- KitchenInterface: import L56, call L122
- POSPage: import L55, call L1590
- SettingsPage: imports L92-93, test L1065/L1089, station L1123/L1135, UI L3845
- SettingsContext: commandMode L155

Old repo path: `c:\Users\suthr\Desktop\reataurent\fe`  (git ref `33e4ad4`)

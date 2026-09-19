import { getSettings } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <h1>הגדרות</h1>
      <SettingsForm values={s} />
    </>
  );
}

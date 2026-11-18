using System;
using System.IO;
using System.Windows.Forms;

namespace SetupHelper
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string exePath = Path.Combine(baseDir, "Тренажёр_Слепой_Печати.exe");
                string iconPath = Path.Combine(baseDir, "app.ico");
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string shortcutPath = Path.Combine(desktop, "Тренажёр слепой печати.lnk");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null)
                {
                    MessageBox.Show("Не удалось получить доступ к WScript.Shell", "Ошибка", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = exePath;
                shortcut.WorkingDirectory = baseDir;
                if (File.Exists(iconPath))
                {
                    shortcut.IconLocation = iconPath + ",0";
                }
                shortcut.Description = "Курс слепой печати «В стране клавиш» (офлайн)";
                shortcut.Save();

                MessageBox.Show(
                    "Ярлык программы «Тренажёр слепой печати» успешно создан на вашем Рабочем столе!\n\nТеперь вы можете запускать тренажёр прямо с Рабочего стола в один клик.",
                    "Успешно",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Не удалось создать ярлык:\n" + ex.Message,
                    "Ошибка",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }
    }
}

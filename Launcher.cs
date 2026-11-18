using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using Microsoft.Win32;

namespace TypingTutorApp
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string htmlPath = Path.Combine(baseDir, "index.html");

                if (!File.Exists(htmlPath))
                {
                    MessageBox.Show(
                        "Не найден файл 'index.html' в папке программы:\n" + baseDir +
                        "\n\nПожалуйста, убедитесь, что все файлы распакованы в одну папку.",
                        "Ошибка запуска тренажёра",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    return;
                }

                // 1. Получаем данные локальной учётной записи ПК
                string userName = Environment.UserName ?? "Ученик";
                string machineName = Environment.MachineName ?? "ПК";
                string domainName = Environment.UserDomainName ?? "";

                // Записываем файл user_env.js для автоматической авторизации в веб-приложении
                try
                {
                    string envJsPath = Path.Combine(baseDir, "user_env.js");
                    string jsContent = string.Format(
                        "/** Автоматически сгенерировано лаунчером ПК */\n" +
                        "window.WINDOWS_USER = {{\n" +
                        "  username: \"{0}\",\n" +
                        "  pcName: \"{1}\",\n" +
                        "  domain: \"{2}\",\n" +
                        "  registeredAt: \"{3}\"\n" +
                        "}};\n",
                        EscapeJs(userName),
                        EscapeJs(machineName),
                        EscapeJs(domainName),
                        DateTime.UtcNow.ToString("o"));

                    File.WriteAllText(envJsPath, jsContent, System.Text.Encoding.UTF8);
                }
                catch {}

                // 2. Папка для сохранения профиля и данных браузера
                string userDataDir = Path.Combine(baseDir, "UserData");
                try
                {
                    if (!Directory.Exists(userDataDir))
                    {
                        Directory.CreateDirectory(userDataDir);
                    }
                }
                catch
                {
                    userDataDir = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "TypingTutorRu",
                        "UserData");
                    Directory.CreateDirectory(userDataDir);
                }

                string browserExe = FindChromiumBrowser();
                string fileUri = new Uri(htmlPath).AbsoluteUri;
                string queryParams = string.Format("?user={0}&pc={1}",
                    Uri.EscapeDataString(userName),
                    Uri.EscapeDataString(machineName));
                string fullUrl = fileUri + queryParams;

                if (!string.IsNullOrEmpty(browserExe) && File.Exists(browserExe))
                {
                    // Запуск в режиме отдельного настольного приложения (App Mode)
                    string args = string.Format(
                        "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1280,840 --disable-features=TranslateUI --disable-session-crashed-bubble",
                        fullUrl,
                        userDataDir);

                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserExe;
                    psi.Arguments = args;
                    psi.UseShellExecute = false;
                    psi.WorkingDirectory = baseDir;

                    Process.Start(psi);
                }
                else
                {
                    // Резервный запуск через системный браузер по умолчанию
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = fullUrl,
                        UseShellExecute = true
                    });
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Не удалось запустить тренажёр:\n" + ex.Message,
                    "Ошибка",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }

        static string EscapeJs(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "");
        }

        static string FindChromiumBrowser()
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

            string[] candidatePaths = new string[]
            {
                // Microsoft Edge (установлен на 100% современных Windows 10/11)
                Path.Combine(programFilesX86, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(programFiles, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(localAppData, @"Microsoft\Edge\Application\msedge.exe"),

                // Google Chrome
                Path.Combine(programFiles, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(programFilesX86, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(localAppData, @"Google\Chrome\Application\chrome.exe"),

                // Яндекс.Браузер
                Path.Combine(localAppData, @"Yandex\YandexBrowser\Application\browser.exe"),
                Path.Combine(programFiles, @"Yandex\YandexBrowser\Application\browser.exe"),
                Path.Combine(programFilesX86, @"Yandex\YandexBrowser\Application\browser.exe"),

                // Brave
                Path.Combine(programFiles, @"BraveSoftware\Brave-Browser\Application\brave.exe"),
                Path.Combine(programFilesX86, @"BraveSoftware\Brave-Browser\Application\brave.exe")
            };

            foreach (string path in candidatePaths)
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    return path;
                }
            }

            // Поиск через реестр Windows
            string registryPath = GetPathFromRegistry(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe");
            if (!string.IsNullOrEmpty(registryPath) && File.Exists(registryPath)) return registryPath;

            registryPath = GetPathFromRegistry(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe");
            if (!string.IsNullOrEmpty(registryPath) && File.Exists(registryPath)) return registryPath;

            return null;
        }

        static string GetPathFromRegistry(string subKey)
        {
            try
            {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(subKey))
                {
                    if (key != null)
                    {
                        object val = key.GetValue("");
                        if (val != null) return val.ToString();
                    }
                }
            }
            catch {}
            return null;
        }
    }
}

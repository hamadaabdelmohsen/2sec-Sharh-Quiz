using Microsoft.AspNetCore.Mvc;

namespace EducationalQuizApp.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}

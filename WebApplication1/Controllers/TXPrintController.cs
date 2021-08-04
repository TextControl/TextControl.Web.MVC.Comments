using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using TXTextControl.Web;

namespace WebApplication1.Controllers {

	public class TXPrintController : ApiController {

		public HttpResponseMessage Get() {
			var printHandler = new PrintHandler();
			printHandler.ProcessRequest(HttpContext.Current);
			return new HttpResponseMessage(HttpStatusCode.OK);
		}
	}
}

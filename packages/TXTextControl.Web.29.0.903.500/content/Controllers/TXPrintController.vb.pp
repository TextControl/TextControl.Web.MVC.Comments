Imports System
Imports System.Collections.Generic
Imports System.Linq
Imports System.Net
Imports System.Net.Http
Imports System.Web
Imports System.Web.Http
Imports TXTextControl.Web

Namespace $rootNamespace$.Controllers

	Public Class TXPrintController
		Inherits ApiController

		Public Function [Get]() As HttpResponseMessage
			Dim printHandler = New PrintHandler()
			printHandler.ProcessRequest(HttpContext.Current)
			Return New HttpResponseMessage(HttpStatusCode.OK)
		End Function

	End Class

End Namespace

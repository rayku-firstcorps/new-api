package middleware

import (
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

func HeaderNavModuleAuth(module string) gin.HandlerFunc {
	return func(c *gin.Context) {
		access := common.GetHeaderNavAccess(module)
		if !access.Enabled {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": fmt.Sprintf("%s is disabled", module),
			})
			c.Abort()
			return
		}

		if access.RequireAuth {
			UserAuth()(c)
			return
		}

		TryUserAuth()(c)
	}
}

func HeaderNavModulePublicOrUserAuth(module string) gin.HandlerFunc {
	return func(c *gin.Context) {
		access := common.GetHeaderNavAccess(module)
		if !access.Enabled || access.RequireAuth {
			UserAuth()(c)
			return
		}

		TryUserAuth()(c)
	}
}

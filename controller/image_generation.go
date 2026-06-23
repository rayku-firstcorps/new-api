package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetImageGenerationTags(c *gin.Context) {
	tags, err := service.GetImageGenerationTags()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    gin.H{"tags": tags},
	})
}

func GetImageGenerationTemplates(c *gin.Context) {
	keyword := c.Query("keyword")
	tag := c.Query("tag")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "24"))

	resp, err := service.GetImageGenerationTemplates(keyword, tag, page, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    resp,
	})
}

func GetImageGenerationTemplate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的模板 ID",
		})
		return
	}

	detail, err := service.GetImageGenerationTemplateDetail(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "模板不存在或已下架",
			})
			return
		}
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    detail,
	})
}

// Admin handlers

func AdminListImageGenerationTemplates(c *gin.Context) {
	keyword := c.Query("keyword")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	templates, total, err := model.AdminGetImageGenerationTemplates(keyword, page, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"items": templates,
			"total": total,
			"page":  page,
		},
	})
}

func AdminGetImageGenerationTemplate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "无效的模板 ID"})
		return
	}
	t, err := model.AdminGetImageGenerationTemplateById(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "模板不存在"})
			return
		}
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": t})
}

func AdminCreateImageGenerationTemplate(c *gin.Context) {
	var input model.ImageGenerationTemplateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	t, err := model.AdminCreateImageGenerationTemplate(&input)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": t})
}

func AdminUpdateImageGenerationTemplate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "无效的模板 ID"})
		return
	}
	var input model.ImageGenerationTemplateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	t, err := model.AdminUpdateImageGenerationTemplate(id, &input)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "模板不存在"})
			return
		}
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": t})
}

func AdminDeleteImageGenerationTemplate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "无效的模板 ID"})
		return
	}
	if err := model.AdminDeleteImageGenerationTemplate(id); err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "删除成功"})
}

// AdminExportImageGenerationTemplates 导出全部模板为可读 JSON，前端负责落地为文件。
func AdminExportImageGenerationTemplates(c *gin.Context) {
	templates, err := model.AdminExportAllImageGenerationTemplates()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	items := make([]model.ImageGenerationTemplateExportItem, 0, len(templates))
	for i := range templates {
		items = append(items, templates[i].ToExportItem())
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    gin.H{"items": items},
	})
}

// imageGenImportItem 是导入交换格式。image_urls / tags 既兼容数组（来自 JSON 导出），
// 也兼容字符串（来自表格单元格里的 JSON 文本）。
type imageGenImportItem struct {
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Prompt      string          `json:"prompt"`
	ImageUrl    string          `json:"image_url"`
	ImageUrls   json.RawMessage `json:"image_urls"`
	Tags        json.RawMessage `json:"tags"`
	Sort        int             `json:"sort"`
	Visible     bool            `json:"visible"`
}

type imageGenImportRequest struct {
	Items []imageGenImportItem `json:"items"`
}

// normalizeStringArrayField 把导入字段统一归一化为「JSON 数组字符串」用于入库。
// 支持三种输入：JSON 数组（["a","b"]）、JSON 字符串（"[\"a\"]" 或 "a"）、空值。
func normalizeStringArrayField(raw json.RawMessage) string {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return ""
	}

	// 情况一：本身就是 JSON 数组
	var arr []string
	if err := common.Unmarshal(raw, &arr); err == nil {
		cleaned := make([]string, 0, len(arr))
		for _, s := range arr {
			s = strings.TrimSpace(s)
			if s != "" {
				cleaned = append(cleaned, s)
			}
		}
		if len(cleaned) == 0 {
			return ""
		}
		b, _ := common.Marshal(cleaned)
		return string(b)
	}

	// 情况二：是一个 JSON 字符串，内容可能是 JSON 数组文本或单值
	var str string
	if err := common.Unmarshal(raw, &str); err == nil {
		str = strings.TrimSpace(str)
		if str == "" {
			return ""
		}
		var inner []string
		if err := common.UnmarshalJsonStr(str, &inner); err == nil {
			cleaned := make([]string, 0, len(inner))
			for _, s := range inner {
				s = strings.TrimSpace(s)
				if s != "" {
					cleaned = append(cleaned, s)
				}
			}
			if len(cleaned) == 0 {
				return ""
			}
			b, _ := common.Marshal(cleaned)
			return string(b)
		}
		// 单值，包成单元素数组
		b, _ := common.Marshal([]string{str})
		return string(b)
	}

	return ""
}

// AdminImportImageGenerationTemplates 批量导入模板（全部新增，忽略 ID）。
func AdminImportImageGenerationTemplates(c *gin.Context) {
	var req imageGenImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "没有可导入的数据"})
		return
	}

	total := len(req.Items)
	inputs := make([]model.ImageGenerationTemplateInput, 0, total)
	failed := 0
	for i := range req.Items {
		item := req.Items[i]
		if strings.TrimSpace(item.Title) == "" ||
			strings.TrimSpace(item.Prompt) == "" ||
			strings.TrimSpace(item.ImageUrl) == "" {
			failed++
			continue
		}
		inputs = append(inputs, model.ImageGenerationTemplateInput{
			Title:       item.Title,
			Description: item.Description,
			Prompt:      item.Prompt,
			ImageUrl:    item.ImageUrl,
			ImageUrls:   normalizeStringArrayField(item.ImageUrls),
			Tags:        normalizeStringArrayField(item.Tags),
			Sort:        item.Sort,
			Visible:     item.Visible,
		})
	}

	imported, err := model.AdminBatchCreateImageGenerationTemplates(inputs)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	failed += len(inputs) - imported

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"imported": imported,
			"failed":   failed,
			"total":    total,
		},
	})
}

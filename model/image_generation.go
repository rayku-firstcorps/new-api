package model

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type ImageGenerationTemplate struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Title       string `json:"title" gorm:"not null;index"`
	Description string `json:"description" gorm:"type:text"`
	Prompt      string `json:"prompt" gorm:"type:text;not null"`
	ImageUrl    string `json:"image_url" gorm:"not null"`
	ImageUrls   string `json:"image_urls" gorm:"type:text"` // JSON 数组字符串
	Tags        string `json:"tags" gorm:"type:text"`       // JSON 数组字符串
	Sort        int    `json:"sort" gorm:"default:0;index"`
	Visible     bool   `json:"visible" gorm:"not null;default:true;index"`
	CreatedAt   int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (t *ImageGenerationTemplate) TableName() string {
	return "image_generation_templates"
}

func (t *ImageGenerationTemplate) GetTagList() []string {
	if t.Tags == "" {
		return []string{}
	}
	var tags []string
	_ = common.Unmarshal([]byte(t.Tags), &tags)
	return tags
}

func (t *ImageGenerationTemplate) GetImageUrlList() []string {
	if t.ImageUrls == "" {
		if t.ImageUrl != "" {
			return []string{t.ImageUrl}
		}
		return []string{}
	}
	var urls []string
	_ = common.Unmarshal([]byte(t.ImageUrls), &urls)
	if len(urls) == 0 && t.ImageUrl != "" {
		return []string{t.ImageUrl}
	}
	return urls
}

type ImageGenerationTemplateListItem struct {
	Id            int      `json:"id"`
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	PromptExcerpt string   `json:"prompt_excerpt"`
	ImageUrl      string   `json:"image_url"`
	ImageUrls     []string `json:"image_urls"`
	Tags          []string `json:"tags"`
	CreatedAt     int64    `json:"created_at"`
	UpdatedAt     int64    `json:"updated_at"`
}

type ImageGenerationTemplateDetail struct {
	Id          int      `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Prompt      string   `json:"prompt"`
	ImageUrl    string   `json:"image_url"`
	ImageUrls   []string `json:"image_urls"`
	Tags        []string `json:"tags"`
	CreatedAt   int64    `json:"created_at"`
	UpdatedAt   int64    `json:"updated_at"`
}

func (t *ImageGenerationTemplate) ToListItem() ImageGenerationTemplateListItem {
	excerpt := t.Prompt
	if len([]rune(excerpt)) > 120 {
		runes := []rune(excerpt)
		excerpt = string(runes[:120]) + "..."
	}
	return ImageGenerationTemplateListItem{
		Id:            t.Id,
		Title:         t.Title,
		Description:   t.Description,
		PromptExcerpt: excerpt,
		ImageUrl:      t.ImageUrl,
		ImageUrls:     t.GetImageUrlList(),
		Tags:          t.GetTagList(),
		CreatedAt:     t.CreatedAt,
		UpdatedAt:     t.UpdatedAt,
	}
}

func (t *ImageGenerationTemplate) ToDetail() ImageGenerationTemplateDetail {
	return ImageGenerationTemplateDetail{
		Id:          t.Id,
		Title:       t.Title,
		Description: t.Description,
		Prompt:      t.Prompt,
		ImageUrl:    t.ImageUrl,
		ImageUrls:   t.GetImageUrlList(),
		Tags:        t.GetTagList(),
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

// ImageGenerationTemplateExportItem 是导出/导入交换格式，数组字段以数组形式呈现，便于人读与表格转换。
type ImageGenerationTemplateExportItem struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Prompt      string   `json:"prompt"`
	ImageUrl    string   `json:"image_url"`
	ImageUrls   []string `json:"image_urls"`
	Tags        []string `json:"tags"`
	Sort        int      `json:"sort"`
	Visible     bool     `json:"visible"`
}

func (t *ImageGenerationTemplate) ToExportItem() ImageGenerationTemplateExportItem {
	return ImageGenerationTemplateExportItem{
		Title:       t.Title,
		Description: t.Description,
		Prompt:      t.Prompt,
		ImageUrl:    t.ImageUrl,
		ImageUrls:   t.GetImageUrlList(),
		Tags:        t.GetTagList(),
		Sort:        t.Sort,
		Visible:     t.Visible,
	}
}

func GetImageGenerationTags() ([]map[string]interface{}, error) {
	var templates []ImageGenerationTemplate
	if err := DB.Where("visible = ?", true).Select("tags").Find(&templates).Error; err != nil {
		return nil, err
	}

	tagCount := make(map[string]int)
	for _, t := range templates {
		for _, tag := range t.GetTagList() {
			tag = strings.TrimSpace(tag)
			if tag != "" {
				tagCount[tag]++
			}
		}
	}

	result := make([]map[string]interface{}, 0, len(tagCount))
	for name, count := range tagCount {
		result = append(result, map[string]interface{}{
			"name":  name,
			"count": count,
		})
	}
	return result, nil
}

func GetImageGenerationTemplates(keyword, tag string, page, pageSize int) ([]ImageGenerationTemplate, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 60 {
		pageSize = 24
	}

	query := DB.Model(&ImageGenerationTemplate{}).Where("visible = ?", true)

	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("title LIKE ? OR description LIKE ? OR prompt LIKE ? OR tags LIKE ?",
			like, like, like, like)
	}

	if tag != "" {
		// 匹配 JSON 数组中包含该标签（TEXT 存储，使用 LIKE 近似匹配）
		tagLike := "%" + tag + "%"
		query = query.Where("tags LIKE ?", tagLike)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var templates []ImageGenerationTemplate
	offset := (page - 1) * pageSize
	if err := query.Order("sort DESC, id DESC").Offset(offset).Limit(pageSize).Find(&templates).Error; err != nil {
		return nil, 0, err
	}

	return templates, total, nil
}

func GetImageGenerationTemplateById(id int) (*ImageGenerationTemplate, error) {
	var template ImageGenerationTemplate
	if err := DB.Where("id = ? AND visible = ?", id, true).First(&template).Error; err != nil {
		return nil, err
	}
	return &template, nil
}

// Admin-only functions

func AdminGetImageGenerationTemplates(keyword string, page, pageSize int) ([]ImageGenerationTemplate, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := DB.Model(&ImageGenerationTemplate{})
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("title LIKE ? OR description LIKE ? OR prompt LIKE ?", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var templates []ImageGenerationTemplate
	offset := (page - 1) * pageSize
	if err := query.Order("sort DESC, id DESC").Offset(offset).Limit(pageSize).Find(&templates).Error; err != nil {
		return nil, 0, err
	}
	return templates, total, nil
}

func AdminGetImageGenerationTemplateById(id int) (*ImageGenerationTemplate, error) {
	var template ImageGenerationTemplate
	if err := DB.First(&template, id).Error; err != nil {
		return nil, err
	}
	return &template, nil
}

type ImageGenerationTemplateInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Prompt      string `json:"prompt"`
	ImageUrl    string `json:"image_url"`
	ImageUrls   string `json:"image_urls"`
	Tags        string `json:"tags"`
	Sort        int    `json:"sort"`
	Visible     bool   `json:"visible"`
}

func AdminCreateImageGenerationTemplate(input *ImageGenerationTemplateInput) (*ImageGenerationTemplate, error) {
	t := &ImageGenerationTemplate{
		Title:       input.Title,
		Description: input.Description,
		Prompt:      input.Prompt,
		ImageUrl:    input.ImageUrl,
		ImageUrls:   input.ImageUrls,
		Tags:        input.Tags,
		Sort:        input.Sort,
		Visible:     input.Visible,
	}
	if err := DB.Create(t).Error; err != nil {
		return nil, err
	}
	return t, nil
}

func AdminUpdateImageGenerationTemplate(id int, input *ImageGenerationTemplateInput) (*ImageGenerationTemplate, error) {
	t := &ImageGenerationTemplate{}
	if err := DB.First(t, id).Error; err != nil {
		return nil, err
	}
	t.Title = input.Title
	t.Description = input.Description
	t.Prompt = input.Prompt
	t.ImageUrl = input.ImageUrl
	t.ImageUrls = input.ImageUrls
	t.Tags = input.Tags
	t.Sort = input.Sort
	t.Visible = input.Visible
	if err := DB.Save(t).Error; err != nil {
		return nil, err
	}
	return t, nil
}

func AdminDeleteImageGenerationTemplate(id int) error {
	return DB.Delete(&ImageGenerationTemplate{}, id).Error
}

// AdminExportAllImageGenerationTemplates 返回全部模板（不分页、不过滤 visible），用于导出。
func AdminExportAllImageGenerationTemplates() ([]ImageGenerationTemplate, error) {
	var templates []ImageGenerationTemplate
	if err := DB.Order("sort DESC, id DESC").Find(&templates).Error; err != nil {
		return nil, err
	}
	return templates, nil
}

// AdminBatchCreateImageGenerationTemplates 批量创建模板（忽略传入 ID，全部作为新记录）。
// title / prompt / image_url 任一为空的行会被跳过。返回成功创建的条数。
func AdminBatchCreateImageGenerationTemplates(inputs []ImageGenerationTemplateInput) (int, error) {
	imported := 0
	for i := range inputs {
		input := inputs[i]
		if strings.TrimSpace(input.Title) == "" ||
			strings.TrimSpace(input.Prompt) == "" ||
			strings.TrimSpace(input.ImageUrl) == "" {
			continue
		}
		t := &ImageGenerationTemplate{
			Title:       input.Title,
			Description: input.Description,
			Prompt:      input.Prompt,
			ImageUrl:    input.ImageUrl,
			ImageUrls:   input.ImageUrls,
			Tags:        input.Tags,
			Sort:        input.Sort,
			Visible:     input.Visible,
		}
		if err := DB.Create(t).Error; err != nil {
			return imported, err
		}
		imported++
	}
	return imported, nil
}

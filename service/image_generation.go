package service

import (
	"github.com/QuantumNous/new-api/model"
)

type ImageGenerationTagItem struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type ImageGenerationListResponse struct {
	Items    []model.ImageGenerationTemplateListItem `json:"items"`
	Page     int                                     `json:"page"`
	PageSize int                                     `json:"page_size"`
	Total    int64                                   `json:"total"`
}

func GetImageGenerationTags() ([]ImageGenerationTagItem, error) {
	rawTags, err := model.GetImageGenerationTags()
	if err != nil {
		return nil, err
	}
	items := make([]ImageGenerationTagItem, 0, len(rawTags))
	for _, t := range rawTags {
		name, _ := t["name"].(string)
		count, _ := t["count"].(int)
		items = append(items, ImageGenerationTagItem{Name: name, Count: count})
	}
	return items, nil
}

func GetImageGenerationTemplates(keyword, tag string, page, pageSize int) (*ImageGenerationListResponse, error) {
	templates, total, err := model.GetImageGenerationTemplates(keyword, tag, page, pageSize)
	if err != nil {
		return nil, err
	}

	if pageSize < 1 || pageSize > 60 {
		pageSize = 24
	}
	if page < 1 {
		page = 1
	}

	items := make([]model.ImageGenerationTemplateListItem, 0, len(templates))
	for i := range templates {
		items = append(items, templates[i].ToListItem())
	}

	return &ImageGenerationListResponse{
		Items:    items,
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, nil
}

func GetImageGenerationTemplateDetail(id int) (*model.ImageGenerationTemplateDetail, error) {
	template, err := model.GetImageGenerationTemplateById(id)
	if err != nil {
		return nil, err
	}
	detail := template.ToDetail()
	return &detail, nil
}

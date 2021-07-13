package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

var FORM_TYPES = []string{
	"I-90",
	"I-102",
	"I-129",
	"I-129CW",
	"I-129F",
	"I-130",
	"I-131",
	"I-140",
	"I-212",
	"I-360",
	"I-485",
	"I-526",
	"I-539",
	"I-600",
	"I-600A",
	"I-601",
	"I-601A",
	"I-612",
	"I-730",
	"I-751",
	"I-765",
	"I-765V",
	"I-800",
	"I-800A",
	"I-817",
	"I-821",
	"I-821D",
	"I-824",
	"I-829",
	"I-914",
	"I-918",
	"I-924",
	"I-929",
}

type Result struct {
	Form   string
	Status string
}

func get(url string, c chan Result) {
	res, _ := http.Get(url)
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		log.Fatal(err)
	}
	body := doc.Find(".rows").First()
	bodyText := body.Text()
	status := body.Find("h1").Text()
	for _, form := range FORM_TYPES {
		if strings.Contains(bodyText, form) {
			c <- Result{status, form}
		}
	}
}

func main() {
	c := make(chan Result)
	url := "https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=EAC2115950627"

	for i := 0; i < 10; i++ {
		go get(url, c)
	}

	for res := range c {
		fmt.Println(res)
	}
}

package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

var CENTER_NAMES = []string{
	"WAC",
	"EAC",
	"VSC",
	"CSC",
	"LIN",
	"NSC",
	"SRC",
	"TSC",
	"MSC",
	"NBC",
	"IOE",
	"YSC",
}

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
	Status string
	Form   string
}

const (
	center_year_day_code_serial = iota
	center_year_code_day_serial
)

func get(url string) Result {
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
			return Result{status, form}
		}
	}
	return Result{status, "unknown"}
}

func toURL(center string, two_digit_yr int, day int, code int, case_serial_numbers int) string {
	return fmt.Sprintf("https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=%s%d%03d%d%04d", center, two_digit_yr, day, code, case_serial_numbers)
}

func clawAsync(center string, two_digit_yr int, day int, code int, case_serial_numbers int, format string, c chan Result) {
	c <- claw(center, two_digit_yr, day, code, case_serial_numbers, format)
}

func claw(center string, two_digit_yr int, day int, code int, case_serial_numbers int, format string) Result {
	return get(toURL(center, two_digit_yr, day, code, case_serial_numbers))
}

func getLastCaseNumber(center string, two_digit_yr int, day int, code int, format string) int {
	low := 1
	high := 1
	for claw(center, two_digit_yr, day, code, high, format).Status != "" && high < 10000 {
		high *= 2
	}
	for low < high {
		mid := (low + high) / 2
		if claw(center, two_digit_yr, day, code, mid, format).Status != "" {
			low = mid + 1
		} else {
			high = mid
		}
	}
	return low
}

func all(center string, two_digit_yr int, day int, code int, format string) {
	const url = "./data_go.json"
	last := getLastCaseNumber(center, two_digit_yr, day, code, format)
	fmt.Printf("loading %s total of %d at day %d\n", center, last, day)
	c := make(chan Result)
	epoch_day := time.Now().Unix() / 86400
	for i := 1; i < last; i++ {
		go clawAsync(center, two_digit_yr, day, code, i, "", c)
	}
	counter := make(map[string]map[int64]int)
	for i := 1; i < last; i++ {
		cur := <-c
		key := fmt.Sprintf("%s|%d|%d|%d|%s|%s", center, two_digit_yr, day, code, cur.Form, cur.Status)

		if counter[key] == nil {
			counter[key] = make(map[int64]int)
		}
		counter[key][epoch_day] += 1
	}
	existingCounter := make(map[string]map[int64]int)
	jsonFile, _ := os.ReadFile(url)
	json.Unmarshal([]byte(jsonFile), &existingCounter)

	getMerged(existingCounter, counter)
	b, _ := json.MarshalIndent(existingCounter, "", "  ")
	ioutil.WriteFile(url, b, 0666)
	fmt.Printf("Done %s total of %d at day %d\n", center, last, day)
}

func getMerged(m1, m2 map[string]map[int64]int) {
	for key, counter := range m2 {
		if m1[key] == nil {
			m1[key] = counter
		} else {
			for day, count := range counter {
				m1[key][day] = count
			}
		}
	}
}

func main() {
	for day := 1; day < 356; day++ {
		for _, name := range CENTER_NAMES {
			all(name, 21, day, 5, "")
		}
	}
}

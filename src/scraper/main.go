package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
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
	res, err := http.Get(url)
	if err != nil {
		return Result{"", ""}
	}
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return Result{"", ""}
	}
	body := doc.Find(".rows").First()
	bodyText := body.Text()
	status := body.Find("h1").Text()
	for _, form := range FORM_TYPES {
		if strings.Contains(bodyText, form) {
			return Result{status, form}
		}
	}
	if status != "" {
		return Result{"I-485", status}
	} else {
		return Result{"", ""}
	}
}

func toURL(center string, two_digit_yr int, day int, code int, case_serial_numbers int, format int) string {
	if format == center_year_day_code_serial {
		res := fmt.Sprintf("https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=%s%d%03d%d%04d", center, two_digit_yr, day, code, case_serial_numbers)
		return res
	} else {
		res := fmt.Sprintf("https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=%s%d%d%03d%04d", center, two_digit_yr, code, day, case_serial_numbers)
		return res
	}
}

func clawAsync(center string, two_digit_yr int, day int, code int, case_serial_numbers int, format int, c chan Result) {
	c <- claw(center, two_digit_yr, day, code, case_serial_numbers, format)
}

func claw(center string, two_digit_yr int, day int, code int, case_serial_numbers int, format int) Result {
	return get(toURL(center, two_digit_yr, day, code, case_serial_numbers, format))
}

func getLastCaseNumber(center string, two_digit_yr int, day int, code int, format int) int {
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
	return low - 1
}

func all(center string, two_digit_yr int, day int, code int, format int, report_c chan int) {
	dir, _ := os.Getwd()
	var url string
	if format == center_year_day_code_serial {
		url = dir + "/data_center_year_day_code_serial.json"
	} else {
		url = dir + "/data_center_year_code_day_serial.json"
	}

	last := getLastCaseNumber(center, two_digit_yr, day, code, format)
	fmt.Printf("loading %s total of %d at day %d\n", center, last, day)
	c := make(chan Result)
	epoch_day := time.Now().Unix() / 86400
	for i := 1; i < last; i++ {
		go clawAsync(center, two_digit_yr, day, code, i, format, c)
	}
	counter := make(map[string]map[int64]int)
	for i := 1; i < last; i++ {
		cur := <-c
		if cur.Status == "" || cur.Form == "" {
			continue
		}

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
	report_c <- 0
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
	for day := 1; day < 3; day++ {
		report_c_center_year_day_code_serial := make(chan int)
		for _, name := range CENTER_NAMES {
			go all(name, 21, day, 5, center_year_day_code_serial, report_c_center_year_day_code_serial)
		}
		for i := 0; i < len(CENTER_NAMES); i++ {
			<-report_c_center_year_day_code_serial
		}

		report_c_center_year_code_day_serial := make(chan int)
		for _, name := range CENTER_NAMES {
			go all(name, 21, day, 9, center_year_code_day_serial, report_c_center_year_code_day_serial)
		}
		for i := 0; i < len(CENTER_NAMES); i++ {
			<-report_c_center_year_code_day_serial
		}
	}
}

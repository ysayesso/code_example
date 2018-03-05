import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';
import { Toast } from '@ionic-native/toast';
import { ErpWerbserviceProvider } from '../../providers/erp-werbservice/erp-werbservice'
import { HomePage } from '../home/home';
import * as WavesAPI from 'waves-api';


@IonicPage()
@Component({
  selector: 'page-list-product',
  templateUrl: 'list-product.html',
})
export class ListProductPage {


  _product: any;
  selectedProduct: any;
  totalPriceOfScanedProduct: any = 0;

  listOfProduct_Odoo: any = [];
  listOfProduct_Html: any = [];
  listOfProduct_Json: any;

  transferDataTransaction: {};
  transfer: string;
  seedn: any;
  bc_tx_id: any;

  assetId = 'DzzKZw5PuHP94U8t4RHPJvuQAb4ipzQGiHud7cWgZUk7';


  Waves = WavesAPI.create(WavesAPI.TESTNET_CONFIG);


  constructor(public navCtrl: NavController, private alerCtrl: AlertController, public navParams: NavParams, private toast: Toast, private erpWerbserviceProvider: ErpWerbserviceProvider, private barcode: BarcodeScanner) {


  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ListProductPage');
  }


  //this function checks if the scaned product exist in the odooDB.
  scanProduct() {
    this.barcode.scan().then((barcodeData) => {
      //the function getProduct(defined in our provider) calls (verb GET) our odooDB using barcodeData.text, 
      //which is the bare code of the scaned Product.  
      this.erpWerbserviceProvider.getProduct(barcodeData.text)
        .then(data => {
          this.selectedProduct = data;
          //if the scaned Product is not found in the odooDB, it will returns an empty array.
          if (this.selectedProduct.length !== 0) {
            //we add a new quantity property to the Product founded.  
            this.addQtyToProduct(this.selectedProduct);
            this.listOfProduct_Html.push(this.selectedProduct);
            //we increment the quantity from 0 to 1 of the scaned Product, that means the user want to buy at least one item.
            this.increment(this.selectedProduct);
          } else {
            this.toast.show(`Product not found`, '5000', 'center').subscribe(
              toast => {
                console.log(toast);
              }
            );
          }
        }, (err) => {
          console.log("error");
        });
    }, (err) => {
      this.toast.show(err, '5000', 'center').subscribe(
        toast => {
          console.log(toast);
        }
      );
    });
  }




  buy() {
    if (this.totalPriceOfScanedProduct > 0) {
      this.seedn = this.Waves.Seed.fromExistingPhrase(this.navParams.get('seed'));
      //this.navCtrl.push(BezahlenPage);
      let confirm = this.alerCtrl.create({
        title: 'Confirmation',
        message: 'Your Total to pay is : ' + this.totalPriceOfScanedProduct + ' SMcoins',
        buttons: [
          {
            text: 'Disagree',
            handler: () => {

            }
          },
          {
            text: 'Agree',
            handler: () => {
              this.transferDataTransaction = {

                // An arbitrary address; mine, in this example
                recipient: '3MxsqknvuyAbftY55UAj3TN94vRtkTTdrdX',

                // ID of a token, or WAVES
                assetId: this.assetId,

                // The real amount is the given number divided by 10^(precision of the token)
                amount: this.totalPriceOfScanedProduct * 100000000,

                // The same rules for these two fields
                feeAssetId: 'WAVES',
                fee: 100000,

                // 140 bytes of data (it's allowed to use Uint8Array here)
                attachment: '',

                timestamp: Date.now()

              };
              this.transfer = this.Waves.API.Node.v1.assets.transfer(this.transferDataTransaction, this.seedn.keyPair).then((responseData) => {
                this.bc_tx_id = responseData.id;
                this.postToOdoo();


                let confirm2 = this.alerCtrl.create({
                  title: 'Success',
                  message: 'your transaction has been done with success',
                  buttons: [
                    {
                      text: 'OK',
                      handler: () => {
                        this.navCtrl.push(HomePage);
                      }
                    }
                  ]

                });
                confirm2.present()
              });



            }
          }
        ]

      });
      confirm.present()
    } else {
      let confirm3 = this.alerCtrl.create({
        title: 'ERROR',
        message: 'Your Total to pay is : ' + this.totalPriceOfScanedProduct + ' SMcoins',
        buttons: [
          {
            text: 'OK',
            handler: () => {
              this.navCtrl.push(HomePage);
            }
          }
        ]

      });
      confirm3.present()
    }

  }


  //this function add the quantity property to product, to store how many items of the same Product the user want to buy.
  addQtyToProduct(product) {
    this._product = {
      name: product.name,
      barcode: product.barcode,
      lst_price: product.lst_price,
      qty: 0
    };
    this.selectedProduct = this._product;
  }

  postToOdoo() {
    this.constructListOfProduct_Odoo(this.listOfProduct_Html);
    this.constructListOfProduct_Json(this.listOfProduct_Odoo);
    this.erpWerbserviceProvider.postProduct(this.listOfProduct_Json);

  }


  deleteProduct(product) {
    //let index = this.listOfProduct_Html.indexOf(product,0);
    let index = this.listOfProduct_Html.indexOf(product);
    if (index > -1) {
      this.listOfProduct_Html.splice(index, 1);
      //this.listOfProduct_Odoo.splice(index,1);
      this.totalPriceOfScanedProduct = Math.round(parseFloat(((this.totalPriceOfScanedProduct - (product.lst_price * product.qty)) * Math.pow(10, 2)).toFixed(2))) / Math.pow(10, 2);


    }
  }

  /*This function adds items to the quantity of the element that has been scanned. */
  private increment(product) {
    product.qty++;
    this.totalPriceOfScanedProduct = Math.round(parseFloat(((this.totalPriceOfScanedProduct + product.lst_price) * Math.pow(10, 2)).toFixed(2))) / Math.pow(10, 2);

  }
  /*This function subtracts items from the quantity of the element that has been scanned. */
  private decrement(product) {
    if (product.qty > 1) {
      product.qty--;
      this.totalPriceOfScanedProduct = Math.round(parseFloat(((this.totalPriceOfScanedProduct - product.lst_price) * Math.pow(10, 2)).toFixed(2))) / Math.pow(10, 2);

    }
  }


  /*This function takes as input the listOfProduct_html, changes its Product object to new ones with only barcode and amount property. 
  The only use of this List is as input for the function constructListOfProduct_Json, to construct Json object to be Post to our OdooDB.*/
  constructListOfProduct_Odoo(htmlListProducts) {
    for (var i = 0; i < htmlListProducts.length; i++) {
      this._product = {
        barcode: htmlListProducts[i].barcode,
        amount: htmlListProducts[i].qty
      };
      this.listOfProduct_Odoo.push(this._product);
    }
  }
  /*This is the second fucntion of our combination to construct the Json Object that we will post to our OdooDB. This function takes as input
  the listOfProduct_odoo, and have as output a object as a Json format.*/
  constructListOfProduct_Json(odooListOfProduct) {
    this.listOfProduct_Json = {
      market_id: 1,
      bc_tx_id: this.bc_tx_id,
      products: odooListOfProduct
    };
  }
}

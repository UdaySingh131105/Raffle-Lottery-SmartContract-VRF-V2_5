const { run } = require("hardhat")

async function verify(ContarctAddress, args) {
   console.log(`verifying contract .............`)
   try {
      await run("verify:verify", {
         address: ContarctAddress,
         constructorArguments: args,
      })
   } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) console.log("Aready Verifyied")
      else console.log(e)
   }
}

module.exports = { verify }

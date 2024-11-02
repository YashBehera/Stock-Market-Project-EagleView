import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "./firebase-config";
import { toast } from "react-toastify";
import { setDoc, doc } from "firebase/firestore";


export default function signInWithGoogle() {
    function googleLogin() {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).then(async (result) => {
          console.log(result);
          const user = result.user;
          if (result.user) {
            await setDoc(doc(db, "Users", user.uid), {
              email: user.email,
              firstName: user.displayName,
              photo: user.photoURL,
              lastName: "",
            });
            toast.success("User logged in Successfully", {
              position: "top-center",
            });
          }
        });
      }
      return (
        <div>
          <p className="text-[12px] mt-2 text-center ">--Or continue with--</p>
          <div
            style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}
            onClick={googleLogin}
          >
            <img src={require("./google.png")} width={"60%"} />
          </div>
        </div>
      );
}
